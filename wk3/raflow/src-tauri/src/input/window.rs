use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tracing::debug;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub app_name: String,
    pub title: String,
    pub process_id: u32,
}

/// Get information about the currently active window
pub fn get_active_window() -> Result<WindowInfo> {
    #[cfg(target_os = "macos")]
    {
        use active_win_pos_rs::get_active_window as get_active;

        match get_active() {
            Ok(window) => {
                debug!(
                    "Active window: {} (PID: {})",
                    window.app_name, window.process_id
                );
                Ok(WindowInfo {
                    app_name: window.app_name,
                    title: window.title,
                    process_id: window.process_id,
                })
            }
            Err(e) => {
                Err(anyhow!("Failed to get active window: {}", e))
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(anyhow!("Active window detection is only supported on macOS"))
    }
}

/// Check if the window is a terminal application
pub fn is_terminal_app(window: &WindowInfo) -> bool {
    let terminal_apps = ["Terminal", "iTerm", "iTerm2", "Alacritty", "Kitty", "Hyper"];
    terminal_apps
        .iter()
        .any(|&app| window.app_name.contains(app))
}

/// Check if the window is an IDE or code editor
pub fn is_code_editor(window: &WindowInfo) -> bool {
    let code_apps = [
        "Code",
        "Visual Studio Code",
        "Xcode",
        "IntelliJ",
        "PyCharm",
        "WebStorm",
        "Sublime Text",
        "Atom",
        "Vim",
        "Emacs",
    ];
    code_apps
        .iter()
        .any(|&app| window.app_name.contains(app))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_terminal_app() {
        let window = WindowInfo {
            app_name: "iTerm2".to_string(),
            title: "bash".to_string(),
            process_id: 12345,
        };
        assert!(is_terminal_app(&window));
    }

    #[test]
    fn test_is_code_editor() {
        let window = WindowInfo {
            app_name: "Visual Studio Code".to_string(),
            title: "main.rs".to_string(),
            process_id: 12345,
        };
        assert!(is_code_editor(&window));
    }
}
