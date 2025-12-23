use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

use crate::audio::{AudioCapture, AudioResampler, VoiceActivityDetector};
use crate::input::TextInjectorService;
use crate::network::WebSocketClient;
use crate::utils::Metrics;

#[derive(Clone)]
pub struct AppState {
    pub audio_capture: Arc<Mutex<Option<AudioCapture>>>,
    pub resampler: Arc<Mutex<Option<AudioResampler>>>,
    pub vad: Arc<Mutex<VoiceActivityDetector>>,
    pub ws_client: Arc<Mutex<Option<WebSocketClient>>>,
    pub is_recording: Arc<Mutex<bool>>,
    pub current_transcript: Arc<Mutex<String>>,
    pub api_key: Arc<Mutex<Option<String>>>,
    pub text_injector_service: Arc<Mutex<Option<TextInjectorService>>>,
    pub metrics: Arc<Metrics>,
}

impl AppState {
    pub fn new() -> Self {
        info!("Initializing RAFlow state");
        Self {
            audio_capture: Arc::new(Mutex::new(None)),
            resampler: Arc::new(Mutex::new(None)),
            vad: Arc::new(Mutex::new(VoiceActivityDetector::default())),
            ws_client: Arc::new(Mutex::new(None)),
            is_recording: Arc::new(Mutex::new(false)),
            current_transcript: Arc::new(Mutex::new(String::new())),
            api_key: Arc::new(Mutex::new(None)),
            text_injector_service: Arc::new(Mutex::new(None)),
            metrics: Arc::new(Metrics::new()),
        }
    }

    /// Initialize the text injector service (must be called after app is setup)
    pub async fn init_text_injector_service(&self, app: tauri::AppHandle) {
        let service = TextInjectorService::new(app);
        *self.text_injector_service.lock().await = Some(service);
        info!("Text injector service initialized");
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
