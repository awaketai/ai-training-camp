use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Emitter, State};
use tracing::{error, info};

use crate::audio::{AudioCapture, AudioResampler, DeviceInfo};
use crate::input::{get_active_window, InjectionStrategy, TextInjector, WindowInfo};
use crate::network::{ServerMessage, WebSocketClient};
use crate::state::AppState;
use crate::utils::{
    check_accessibility_permission, check_microphone_permission, open_system_preferences,
    PerformanceMetrics, PermissionStatus,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct PermissionInfo {
    pub microphone: PermissionStatus,
    pub accessibility: PermissionStatus,
    pub all_granted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptStatus {
    pub is_recording: bool,
    pub transcript: String,
    pub is_speaking: bool,
}

/// List all available audio input devices
#[command]
pub async fn list_audio_devices() -> Result<Vec<DeviceInfo>, String> {
    info!("Listing audio devices");

    let capture = AudioCapture::new().map_err(|e| {
        error!("Failed to create audio capture: {}", e);
        e.to_string()
    })?;

    capture.list_devices().map_err(|e| {
        error!("Failed to list devices: {}", e);
        e.to_string()
    })
}

/// Start audio recording and transcription
#[command]
pub async fn start_recording(
    app: AppHandle,
    state: State<'_, AppState>,
    api_key: String,
    device_name: Option<String>,
) -> Result<(), String> {
    info!("Starting recording with device: {:?}", device_name);

    // Store API key
    *state.api_key.lock().await = Some(api_key.clone());

    // Check if already recording
    let is_recording = *state.is_recording.lock().await;
    if is_recording {
        return Err("Already recording".to_string());
    }

    // Initialize audio capture
    let mut capture = AudioCapture::new().map_err(|e| e.to_string())?;

    if let Some(device) = device_name {
        capture.set_device(&device).map_err(|e| e.to_string())?;
    } else {
        capture.use_default_device().map_err(|e| e.to_string())?;
    }

    let sample_rate = capture.sample_rate().ok_or("No sample rate")?;

    // Create channel for audio packets
    let (audio_tx, mut audio_rx) = tokio::sync::mpsc::channel(100);

    // Start audio stream
    capture.start_stream(audio_tx).map_err(|e| e.to_string())?;

    // Initialize resampler (device sample rate -> 16kHz)
    let resampler = AudioResampler::new(sample_rate as usize, 16000, 1600)
        .map_err(|e| e.to_string())?;

    // Store in state
    *state.audio_capture.lock().await = Some(capture);
    *state.resampler.lock().await = Some(resampler);
    *state.is_recording.lock().await = true;

    // Initialize WebSocket client
    let mut ws_client = WebSocketClient::new(api_key);
    let (mut ws_sink, ws_stream) = ws_client.connect().await.map_err(|e| {
        error!("Failed to connect WebSocket: {}", e);
        e.to_string()
    })?;

    // Start WebSocket receive loop
    let (server_tx, mut server_rx) = tokio::sync::mpsc::channel(100);
    tokio::spawn(async move {
        if let Err(e) = WebSocketClient::receive_loop(ws_stream, server_tx).await {
            error!("WebSocket receive loop error: {}", e);
        }
    });

    // Store WebSocket client
    *state.ws_client.lock().await = Some(ws_client);

    // Clone state for async task
    let state_clone = state.inner().clone();
    let app_clone = app.clone();

    // Audio processing task
    tokio::spawn(async move {
        let mut buffer = Vec::new();
        const CHUNK_SIZE: usize = 1600; // 100ms at 16kHz

        while let Some(audio_packet) = audio_rx.recv().await {
            // Check if still recording
            if !*state_clone.is_recording.lock().await {
                break;
            }

            // Resample to 16kHz
            let mut resampler_guard = state_clone.resampler.lock().await;
            if let Some(resampler) = resampler_guard.as_mut() {
                match resampler.process(&audio_packet) {
                    Ok(resampled) => {
                        buffer.extend_from_slice(&resampled);

                        // Process in chunks
                        while buffer.len() >= CHUNK_SIZE {
                            let chunk: Vec<f32> = buffer.drain(..CHUNK_SIZE).collect();

                            // VAD detection
                            let mut vad = state_clone.vad.lock().await;
                            let is_speech = vad.is_speech(&chunk);
                            let audio_level = vad.get_audio_level(&chunk);
                            drop(vad);

                            // Emit audio level to frontend
                            let _ = app_clone.emit("audio-level", audio_level);

                            // Send to WebSocket if speech detected
                            if is_speech {
                                if let Err(e) =
                                    WebSocketClient::send_audio(&mut ws_sink, &chunk).await
                                {
                                    error!("Failed to send audio: {}", e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Resampling error: {}", e);
                    }
                }
            }
        }

        info!("Audio processing task ended");
    });

    // Transcript processing task
    let app_clone = app.clone();
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        while let Some(msg) = server_rx.recv().await {
            match msg {
                ServerMessage::PartialTranscript { text, .. } => {
                    info!("Partial transcript: {}", text);
                    *state_clone.current_transcript.lock().await = text.clone();

                    let _ = app_clone.emit(
                        "transcript-update",
                        serde_json::json!({
                            "text": text,
                            "is_final": false,
                        }),
                    );
                }
                ServerMessage::CommittedTranscript { text, .. } => {
                    info!("Committed transcript: {}", text);
                    *state_clone.current_transcript.lock().await = text.clone();

                    let _ = app_clone.emit(
                        "transcript-update",
                        serde_json::json!({
                            "text": text,
                            "is_final": true,
                        }),
                    );
                }
                ServerMessage::InputError { error_message, .. } => {
                    error!("API Error: {}", error_message);
                    let _ = app_clone.emit("transcript-error", error_message);
                }
                ServerMessage::SessionStarted { session_id, .. } => {
                    info!("Session started: {}", session_id);
                }
                _ => {}
            }
        }

        info!("Transcript processing task ended");
    });

    info!("Recording started successfully");
    Ok(())
}

/// Stop audio recording
#[command]
pub async fn stop_recording(state: State<'_, AppState>) -> Result<(), String> {
    info!("Stopping recording");

    *state.is_recording.lock().await = false;

    // Stop audio capture
    if let Some(mut capture) = state.audio_capture.lock().await.take() {
        capture.stop_stream().map_err(|e| e.to_string())?;
    }

    // Clear state
    *state.resampler.lock().await = None;
    *state.ws_client.lock().await = None;
    *state.current_transcript.lock().await = String::new();

    info!("Recording stopped successfully");
    Ok(())
}

/// Get current transcript status
#[command]
pub async fn get_transcript_status(state: State<'_, AppState>) -> Result<TranscriptStatus, String> {
    let is_recording = *state.is_recording.lock().await;
    let transcript = state.current_transcript.lock().await.clone();
    let vad = state.vad.lock().await;
    let is_speaking = vad.is_currently_speaking();

    Ok(TranscriptStatus {
        is_recording,
        transcript,
        is_speaking,
    })
}

/// Inject text into the active application
#[command]
pub async fn inject_text(
    app: AppHandle,
    state: State<'_, AppState>,
    text: String,
    strategy: Option<String>,
) -> Result<(), String> {
    info!("Injecting text: {} chars", text.len());

    // Parse strategy
    let strategy = strategy.and_then(|s| match s.as_str() {
        "keyboard" => Some(InjectionStrategy::Keyboard),
        "clipboard" => Some(InjectionStrategy::Clipboard),
        _ => None,
    });

    // Get or create text injector
    let mut injector_guard = state.text_injector.lock().await;
    if injector_guard.is_none() {
        *injector_guard = Some(TextInjector::new().map_err(|e| {
            error!("Failed to create text injector: {}", e);
            e.to_string()
        })?);
    }

    if let Some(injector) = injector_guard.as_mut() {
        injector
            .inject(&app, &text, strategy)
            .await
            .map_err(|e| {
                error!("Failed to inject text: {}", e);
                e.to_string()
            })?;
    }

    info!("Text injection completed");
    Ok(())
}

/// Get information about the currently active window
#[command]
pub fn get_active_window_info() -> Result<WindowInfo, String> {
    get_active_window().map_err(|e| {
        error!("Failed to get active window: {}", e);
        e.to_string()
    })
}

/// Check system permissions status
#[command]
pub fn check_permissions() -> PermissionInfo {
    let microphone = check_microphone_permission();
    let accessibility = check_accessibility_permission();
    let all_granted =
        microphone == PermissionStatus::Granted && accessibility == PermissionStatus::Granted;

    info!(
        "Permissions - Microphone: {:?}, Accessibility: {:?}",
        microphone, accessibility
    );

    PermissionInfo {
        microphone,
        accessibility,
        all_granted,
    }
}

/// Open system preferences to request permissions
#[command]
pub fn request_permissions(permission_type: String) -> Result<(), String> {
    info!("Requesting permission: {}", permission_type);
    open_system_preferences(&permission_type)
}

/// Get current performance metrics
#[command]
pub fn get_performance_metrics(state: State<'_, AppState>) -> PerformanceMetrics {
    state.metrics.snapshot()
}

/// Log current performance metrics
#[command]
pub fn log_performance_metrics(state: State<'_, AppState>) {
    state.metrics.log_metrics();
}

/// Check if system performance is healthy
#[command]
pub fn check_system_health(state: State<'_, AppState>) -> bool {
    state.metrics.is_healthy()
}
