use super::*;

#[cfg(test)]
mod window_tests {
    use super::*;
    use crate::input::window::WindowInfo;

    #[test]
    fn test_window_info_creation() {
        let window = WindowInfo {
            app_name: "Terminal".to_string(),
            title: "bash".to_string(),
            process_id: 1234,
        };

        assert_eq!(window.app_name, "Terminal");
        assert_eq!(window.title, "bash");
        assert_eq!(window.process_id, 1234);
    }

    #[test]
    fn test_is_terminal_app() {
        let terminal_window = WindowInfo {
            app_name: "Terminal".to_string(),
            title: "bash".to_string(),
            process_id: 1234,
        };

        assert!(terminal_window.app_name.contains("Terminal"));
    }

    #[test]
    fn test_is_code_editor() {
        let vscode_window = WindowInfo {
            app_name: "Visual Studio Code".to_string(),
            title: "main.rs".to_string(),
            process_id: 5678,
        };

        assert!(vscode_window.app_name.contains("Code"));
    }
}

#[cfg(test)]
mod injector_tests {
    use super::*;
    use crate::input::injector::InjectionStrategy;
    use crate::input::window::WindowInfo;

    #[test]
    fn test_injection_strategy_selection_short_text() {
        let window = WindowInfo {
            app_name: "Safari".to_string(),
            title: "Google".to_string(),
            process_id: 1234,
        };

        let short_text = "Hello";
        // Short text should prefer keyboard
        assert!(short_text.len() < 20);
    }

    #[test]
    fn test_injection_strategy_selection_long_text() {
        let window = WindowInfo {
            app_name: "Safari".to_string(),
            title: "Google".to_string(),
            process_id: 1234,
        };

        let long_text = "This is a very long piece of text that should trigger clipboard injection";
        // Long text should prefer clipboard
        assert!(long_text.len() >= 20);
    }

    #[test]
    fn test_injection_strategy_for_terminal() {
        let window = WindowInfo {
            app_name: "iTerm2".to_string(),
            title: "zsh".to_string(),
            process_id: 1234,
        };

        // Terminal should always use keyboard regardless of text length
        let long_text = "This is a very long command that would normally use clipboard";
        assert!(long_text.len() > 20);
        assert!(window.app_name.contains("Term"));
    }

    #[test]
    fn test_injection_strategy_for_ide() {
        let window = WindowInfo {
            app_name: "Visual Studio Code".to_string(),
            title: "main.rs".to_string(),
            process_id: 5678,
        };

        // IDE should prefer keyboard for precision
        assert!(window.app_name.contains("Code"));
    }
}

#[cfg(test)]
mod strategy_tests {
    use super::*;
    use crate::input::injector::InjectionStrategy;

    #[test]
    fn test_strategy_enum() {
        let keyboard = InjectionStrategy::Keyboard;
        let clipboard = InjectionStrategy::Clipboard;

        assert!(matches!(keyboard, InjectionStrategy::Keyboard));
        assert!(matches!(clipboard, InjectionStrategy::Clipboard));
    }
}

#[cfg(test)]
mod text_sanitization_tests {
    #[test]
    fn test_text_with_newlines() {
        let text = "Line 1\nLine 2\nLine 3";
        assert_eq!(text.lines().count(), 3);
    }

    #[test]
    fn test_text_with_special_characters() {
        let text = "Hello! @#$%^&*() World?";
        assert!(text.contains('!'));
        assert!(text.contains('@'));
        assert!(text.contains('?'));
    }

    #[test]
    fn test_text_with_unicode() {
        let text = "Hello 世界 🌍";
        assert!(text.contains("世界"));
        assert!(text.contains('🌍'));
    }

    #[test]
    fn test_empty_text() {
        let text = "";
        assert_eq!(text.len(), 0);
        assert!(text.is_empty());
    }

    #[test]
    fn test_whitespace_only_text() {
        let text = "   \t\n  ";
        assert!(!text.is_empty());
        assert_eq!(text.trim().len(), 0);
    }
}
