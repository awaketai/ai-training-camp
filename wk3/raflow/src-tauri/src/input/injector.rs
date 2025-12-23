use anyhow::{anyhow, Result};
use enigo::{Enigo, Key, Keyboard, Settings};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tracing::{debug, error, info};

use super::window::{get_active_window, is_code_editor, is_terminal_app, WindowInfo};

/// Request to inject text
#[derive(Debug)]
pub enum InjectionRequest {
    Inject {
        text: String,
        strategy: Option<InjectionStrategy>,
        response_tx: tokio::sync::oneshot::Sender<Result<()>>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InjectionStrategy {
    /// Type text character by character
    Keyboard,
    /// Use clipboard and paste command
    Clipboard,
}

/// Text injector that can type text into other applications
pub struct TextInjector {
    enigo: Enigo,
}

impl TextInjector {
    /// Create a new text injector
    pub fn new() -> Result<Self> {
        let enigo = Enigo::new(&Settings::default()).map_err(|e| {
            error!("Failed to initialize Enigo: {}", e);
            anyhow!("Failed to initialize keyboard simulator: {}", e)
        })?;

        Ok(Self { enigo })
    }

    /// Type text character by character using keyboard simulation
    pub fn type_text(&mut self, text: &str) -> Result<()> {
        info!("Typing text via keyboard: {} chars", text.len());

        for ch in text.chars() {
            // Use text method which handles Unicode correctly
            self.enigo.text(&ch.to_string()).map_err(|e| {
                error!("Failed to type character '{}': {}", ch, e);
                anyhow!("Keyboard typing error: {}", e)
            })?;

            // Small delay to avoid typing too fast
            thread::sleep(Duration::from_millis(10));
        }

        debug!("Finished typing text");
        Ok(())
    }

    /// Inject text using clipboard (copy-paste)
    pub async fn inject_via_clipboard(
        &mut self,
        app: &AppHandle,
        text: &str,
    ) -> Result<()> {
        info!("Injecting text via clipboard: {} chars", text.len());

        // 1. Backup current clipboard content
        let old_content = app.clipboard().read_text().ok();
        debug!("Backed up clipboard content");

        // 2. Write new text to clipboard
        app.clipboard()
            .write_text(text)
            .map_err(|e| anyhow!("Failed to write to clipboard: {}", e))?;
        debug!("Wrote text to clipboard");

        // Small delay to ensure clipboard is updated
        tokio::time::sleep(Duration::from_millis(50)).await;

        // 3. Simulate paste command (Cmd+V on macOS)
        #[cfg(target_os = "macos")]
        {
            self.enigo
                .key(Key::Meta, enigo::Direction::Press)
                .map_err(|e| anyhow!("Failed to press Meta key: {}", e))?;

            thread::sleep(Duration::from_millis(10));

            self.enigo
                .key(Key::Unicode('v'), enigo::Direction::Click)
                .map_err(|e| anyhow!("Failed to click V key: {}", e))?;

            thread::sleep(Duration::from_millis(10));

            self.enigo
                .key(Key::Meta, enigo::Direction::Release)
                .map_err(|e| anyhow!("Failed to release Meta key: {}", e))?;

            debug!("Simulated Cmd+V");
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Ctrl+V on Windows/Linux
            self.enigo
                .key(Key::Control, enigo::Direction::Press)
                .map_err(|e| anyhow!("Failed to press Ctrl key: {}", e))?;

            thread::sleep(Duration::from_millis(10));

            self.enigo
                .key(Key::Unicode('v'), enigo::Direction::Click)
                .map_err(|e| anyhow!("Failed to click V key: {}", e))?;

            thread::sleep(Duration::from_millis(10));

            self.enigo
                .key(Key::Control, enigo::Direction::Release)
                .map_err(|e| anyhow!("Failed to release Ctrl key: {}", e))?;
        }

        // 4. Wait for paste to complete
        tokio::time::sleep(Duration::from_millis(100)).await;

        // 5. Restore original clipboard content
        if let Some(old) = old_content {
            if let Err(e) = app.clipboard().write_text(&old) {
                error!("Failed to restore clipboard: {}", e);
            } else {
                debug!("Restored clipboard content");
            }
        }

        info!("Text injection via clipboard completed");
        Ok(())
    }

    /// Select the best injection strategy based on text and target window
    pub fn select_strategy(text: &str, window: &WindowInfo) -> InjectionStrategy {
        // Short text: use keyboard
        if text.len() < 20 {
            debug!("Using keyboard strategy (short text: {} chars)", text.len());
            return InjectionStrategy::Keyboard;
        }

        // Terminal or code editor: prefer keyboard for better compatibility
        if is_terminal_app(window) || is_code_editor(window) {
            debug!(
                "Using keyboard strategy (terminal/IDE: {})",
                window.app_name
            );
            return InjectionStrategy::Keyboard;
        }

        // Long text in other apps: use clipboard for speed
        debug!("Using clipboard strategy (long text: {} chars)", text.len());
        InjectionStrategy::Clipboard
    }

    /// Inject text using the appropriate strategy
    pub async fn inject(
        &mut self,
        app: &AppHandle,
        text: &str,
        strategy: Option<InjectionStrategy>,
    ) -> Result<()> {
        if text.is_empty() {
            return Ok(());
        }

        // Get active window and determine strategy
        let window = get_active_window()?;
        let strategy = strategy.unwrap_or_else(|| Self::select_strategy(text, &window));

        info!(
            "Injecting text to {} using {:?} strategy",
            window.app_name, strategy
        );

        match strategy {
            InjectionStrategy::Keyboard => self.type_text(text),
            InjectionStrategy::Clipboard => self.inject_via_clipboard(app, text).await,
        }
    }
}

impl Default for TextInjector {
    fn default() -> Self {
        Self::new().expect("Failed to create TextInjector")
    }
}

/// Service that manages text injection in a dedicated thread
#[derive(Clone)]
pub struct TextInjectorService {
    request_tx: mpsc::Sender<InjectionRequest>,
}

impl TextInjectorService {
    /// Create a new text injector service and spawn background thread
    pub fn new(app: AppHandle) -> Self {
        let (request_tx, request_rx) = mpsc::channel::<InjectionRequest>();

        // Spawn dedicated thread for text injection
        thread::spawn(move || {
            Self::run_service(app, request_rx);
        });

        Self { request_tx }
    }

    /// Run the service loop in dedicated thread
    fn run_service(app: AppHandle, request_rx: mpsc::Receiver<InjectionRequest>) {
        info!("Text injector service thread started");

        // Create TextInjector in this thread (it's not Send, so stays here)
        let mut injector = match TextInjector::new() {
            Ok(inj) => inj,
            Err(e) => {
                error!("Failed to create TextInjector: {}", e);
                return;
            }
        };

        // Process requests
        while let Ok(request) = request_rx.recv() {
            match request {
                InjectionRequest::Inject {
                    text,
                    strategy,
                    response_tx,
                } => {
                    info!("Processing injection request for {} chars", text.len());

                    // Create a tokio runtime in this thread for async operations
                    let rt = tokio::runtime::Runtime::new().unwrap();
                    let result = rt.block_on(injector.inject(&app, &text, strategy));

                    // Send response back
                    let _ = response_tx.send(result);
                }
            }
        }

        info!("Text injector service thread ended");
    }

    /// Inject text using the service
    pub async fn inject_text(
        &self,
        text: String,
        strategy: Option<InjectionStrategy>,
    ) -> Result<()> {
        let (response_tx, response_rx) = tokio::sync::oneshot::channel();

        let request = InjectionRequest::Inject {
            text,
            strategy,
            response_tx,
        };

        self.request_tx
            .send(request)
            .map_err(|e| anyhow!("Failed to send injection request: {}", e))?;

        response_rx
            .await
            .map_err(|e| anyhow!("Failed to receive injection response: {}", e))?
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_strategy_short_text() {
        let window = WindowInfo {
            app_name: "Safari".to_string(),
            title: "Google".to_string(),
            process_id: 12345,
        };

        let strategy = TextInjector::select_strategy("Hello", &window);
        assert_eq!(strategy, InjectionStrategy::Keyboard);
    }

    #[test]
    fn test_select_strategy_terminal() {
        let window = WindowInfo {
            app_name: "iTerm2".to_string(),
            title: "bash".to_string(),
            process_id: 12345,
        };

        let text = "This is a longer text that would normally use clipboard";
        let strategy = TextInjector::select_strategy(text, &window);
        assert_eq!(strategy, InjectionStrategy::Keyboard);
    }

    #[test]
    fn test_select_strategy_long_text() {
        let window = WindowInfo {
            app_name: "Safari".to_string(),
            title: "Google".to_string(),
            process_id: 12345,
        };

        let text = "This is a much longer text that should use clipboard strategy for efficiency and speed. It contains many characters and would be slow to type character by character.";
        let strategy = TextInjector::select_strategy(text, &window);
        assert_eq!(strategy, InjectionStrategy::Clipboard);
    }
}
