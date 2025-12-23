use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Emitter, State};
use tracing::{debug, error, info};

use crate::audio::{AudioCapture, AudioResampler, DeviceInfo};
use crate::input::{get_active_window, InjectionStrategy, WindowInfo};
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
    info!("API key length: {}", api_key.len());

    // Store API key
    *state.api_key.lock().await = Some(api_key.clone());

    // Check if already recording
    let is_recording = *state.is_recording.lock().await;
    if is_recording {
        error!("Already recording");
        return Err("Already recording".to_string());
    }

    // Initialize audio capture
    info!("Creating audio capture...");
    let mut capture = AudioCapture::new().map_err(|e| {
        error!("Failed to create audio capture: {}", e);
        e.to_string()
    })?;

    if let Some(device) = device_name {
        info!("Setting device: {}", device);
        capture.set_device(&device).map_err(|e| {
            error!("Failed to set device: {}", e);
            e.to_string()
        })?;
    } else {
        info!("Using default device...");
        capture.use_default_device().map_err(|e| {
            error!("Failed to use default device: {}", e);
            e.to_string()
        })?;
    }

    let sample_rate = capture.sample_rate().ok_or_else(|| {
        error!("No sample rate available");
        "No sample rate".to_string()
    })?;
    info!("Sample rate: {}", sample_rate);

    // Create channel for audio packets (increased capacity for better performance)
    let (audio_tx, mut audio_rx) = tokio::sync::mpsc::channel(500);

    // Start audio stream
    info!("Starting audio stream...");
    capture.start_stream(audio_tx).map_err(|e| {
        error!("Failed to start audio stream: {}", e);
        e.to_string()
    })?;
    info!("Audio stream started");

    // Initialize resampler (device sample rate -> 16kHz)
    info!("Creating resampler...");
    let resampler = AudioResampler::new(sample_rate as usize, 16000, 1600)
        .map_err(|e| {
            error!("Failed to create resampler: {}", e);
            e.to_string()
        })?;
    info!("Resampler created");

    // Store in state
    *state.audio_capture.lock().await = Some(capture);
    *state.resampler.lock().await = Some(resampler);

    // Initialize WebSocket client BEFORE setting is_recording to true
    info!("🌐 Attempting WebSocket connection...");
    info!("🔧 Model: scribe_v2_realtime, Language: zh (Chinese)");
    let mut ws_client = WebSocketClient::new(api_key);
    let (mut ws_sink, ws_stream) = match ws_client.connect().await {
        Ok(streams) => {
            info!("✅ WebSocket connected successfully!");
            streams
        }
        Err(e) => {
            error!("❌ WebSocket connection FAILED: {}", e);
            error!("💡 This might mean scribe_v1 or language_code=cmn is not supported");
            // Clean up on error
            *state.audio_capture.lock().await = None;
            *state.resampler.lock().await = None;
            return Err(format!("WebSocket connection failed: {}. Please check your API key and model availability.", e));
        }
    };

    // Only set is_recording to true AFTER successful WebSocket connection
    *state.is_recording.lock().await = true;

    // Start WebSocket receive loop
    let (server_tx, mut server_rx) = tokio::sync::mpsc::channel(100);
    let state_for_ws_close = state.inner().clone();
    let app_for_ws_close = app.clone();

    tokio::spawn(async move {
        if let Err(e) = WebSocketClient::receive_loop(ws_stream, server_tx).await {
            error!("WebSocket receive loop error: {}", e);
        }

        // WebSocket closed, stop recording
        info!("WebSocket closed, stopping recording");
        *state_for_ws_close.is_recording.lock().await = false;

        // Notify frontend
        let _ = app_for_ws_close.emit("recording-stopped", "WebSocket connection closed");
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
        let mut was_speaking = false; // Track previous speaking state
        let mut audio_chunk_count = 0;

        info!("🎤 Audio processing task started");

        while let Some(audio_packet) = audio_rx.recv().await {
            audio_chunk_count += 1;

            // Check audio signal every 100 packets
            if audio_chunk_count % 100 == 0 {
                let rms: f32 = audio_packet.iter().map(|x| x * x).sum::<f32>() / audio_packet.len() as f32;
                let rms = rms.sqrt();
                info!("📊 Audio input RMS: {:.6} (packet #{})", rms, audio_chunk_count);
            }

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

                            // VAD detection for audio level monitoring and speech detection
                            let mut vad = state_clone.vad.lock().await;
                            let is_speech = vad.is_speech(&chunk);
                            let audio_level = vad.get_audio_level(&chunk);
                            drop(vad);

                            // Emit audio level to frontend
                            let _ = app_clone.emit("audio-level", audio_level);

                            // Detect speech end (transition from speaking to silence)
                            let speech_ended = was_speaking && !is_speech;
                            was_speaking = is_speech;

                            // Always send audio to WebSocket (let server decide what to transcribe)
                            // Send commit=true when speech ends to finalize the current segment
                            // Check if still recording before sending
                            if !*state_clone.is_recording.lock().await {
                                info!("Recording stopped, breaking audio send loop");
                                break;
                            }

                            if let Err(e) =
                                WebSocketClient::send_audio(&mut ws_sink, &chunk, speech_ended).await
                            {
                                error!("Failed to send audio: {}", e);
                                // Stop recording on send error
                                *state_clone.is_recording.lock().await = false;
                                break;
                            }

                            // Log when speech is detected or ends
                            if is_speech {
                                info!("🗣️  Speech detected, audio level: {:.4}", audio_level);
                            } else if speech_ended {
                                info!("🔚 Speech ended, sent commit signal");
                            }
                        }
                    }
                    Err(e) => {
                        error!("Resampling error: {}", e);
                    }
                }
            }
        }

        info!("🔇 Audio processing task ended");
    });

    // Transcript processing task
    let app_clone = app.clone();
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        info!("=== Transcript processing task started ===");
        while let Some(msg) = server_rx.recv().await {
            info!("Received server message: {:?}", msg);

            match msg {
                ServerMessage::PartialTranscript { text, .. } => {
                    info!("📝 PARTIAL TRANSCRIPT: \"{}\"", text);
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
                    info!("✅ COMMITTED TRANSCRIPT: \"{}\"", text);
                    *state_clone.current_transcript.lock().await = text.clone();

                    let _ = app_clone.emit(
                        "transcript-update",
                        serde_json::json!({
                            "text": text,
                            "is_final": true,
                        }),
                    );
                }
                ServerMessage::CommittedTranscriptWithTimestamps { text, .. } => {
                    info!("✅ COMMITTED TRANSCRIPT (with timestamps): \"{}\"", text);
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
                    error!("❌ API Error: {}", error_message);
                    let _ = app_clone.emit("transcript-error", error_message);
                }
                ServerMessage::InvalidRequest { error } => {
                    error!("❌ Invalid Request: {}", error);
                    let _ = app_clone.emit("transcript-error", error);
                    // Stop recording on invalid request
                    *state_clone.is_recording.lock().await = false;
                }
                ServerMessage::SessionStarted { session_id, model_id } => {
                    info!("🎬 Session started: {} (model: {})", session_id, model_id);
                }
                _ => {
                    info!("Other message type received: {:?}", msg);
                }
            }
        }

        info!("=== Transcript processing task ended ===");
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

    // Get the text injector service
    let service_guard = state.text_injector_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        service
            .inject_text(text, strategy)
            .await
            .map_err(|e| {
                error!("Failed to inject text: {}", e);
                e.to_string()
            })?;
    } else {
        return Err("Text injector service not initialized".to_string());
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
