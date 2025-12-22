mod audio;
mod commands;
mod input;
mod network;
mod state;
mod utils;

use anyhow::Result;
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager};

pub use state::AppState;
pub use utils::{RAFlowError, RecoveryStrategy, Metrics, PerformanceMetrics};
pub use network::RetryPolicy;
pub use audio::AudioBuffer;

const APP_PATH: &str = "raflow";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<()> {
    let app_path = dirs::data_local_dir().unwrap().join(APP_PATH);
    if !app_path.exists() {
        std::fs::create_dir_all(&app_path)?;
    }
    let state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("raflow.log".to_string()),
                    },
                ))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::list_audio_devices,
            commands::start_recording,
            commands::stop_recording,
            commands::get_transcript_status,
            commands::inject_text,
            commands::get_active_window_info,
            commands::check_permissions,
            commands::request_permissions,
            commands::get_performance_metrics,
            commands::log_performance_metrics,
            commands::check_system_health,
        ])
        .setup(|app| {
            app.manage(state);
            setup_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

fn setup_tray(app: &tauri::App) -> Result<()> {
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&toggle, &settings, &quit])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => {
                app.exit(0);
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "toggle" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
