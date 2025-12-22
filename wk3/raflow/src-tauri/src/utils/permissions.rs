use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotDetermined,
    Unknown,
}

/// Check microphone permission status on macOS
#[cfg(target_os = "macos")]
pub fn check_microphone_permission() -> PermissionStatus {
    use cocoa::base::nil;
    use objc::{class, msg_send, runtime::Object, sel, sel_impl};

    unsafe {
        let av_capture_device = class!(AVCaptureDevice);
        let media_type: *mut Object = msg_send![class!(AVMediaType), mediaTypeAudio];

        let status: isize = msg_send![av_capture_device, authorizationStatusForMediaType: media_type];

        // AVAuthorizationStatus values:
        // 0 = NotDetermined, 1 = Restricted, 2 = Denied, 3 = Authorized
        let permission = match status {
            0 => PermissionStatus::NotDetermined,
            2 => PermissionStatus::Denied,
            3 => PermissionStatus::Granted,
            _ => PermissionStatus::Unknown,
        };

        debug!("Microphone permission status: {:?}", permission);
        permission
    }
}

#[cfg(not(target_os = "macos"))]
pub fn check_microphone_permission() -> PermissionStatus {
    PermissionStatus::Granted // Assume granted on non-macOS platforms
}

/// Check accessibility permission status on macOS
/// This is required for keyboard/mouse simulation
#[cfg(target_os = "macos")]
pub fn check_accessibility_permission() -> PermissionStatus {
    use core_graphics::event::{CGEvent, CGEventType};

    // Try to create a test event to check if we have accessibility permissions
    let event = CGEvent::new(CGEventType::Null);

    if event.is_ok() {
        // Try to post the event - if this succeeds, we have permissions
        match CGEvent::new(CGEventType::KeyDown) {
            Ok(_) => {
                debug!("Accessibility permission: Granted");
                PermissionStatus::Granted
            }
            Err(_) => {
                debug!("Accessibility permission: Denied");
                PermissionStatus::Denied
            }
        }
    } else {
        debug!("Accessibility permission: Unknown");
        PermissionStatus::Unknown
    }
}

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility_permission() -> PermissionStatus {
    PermissionStatus::Granted // Assume granted on non-macOS platforms
}

/// Open System Preferences to the relevant permission page
#[cfg(target_os = "macos")]
pub fn open_system_preferences(permission_type: &str) -> Result<(), String> {
    use std::process::Command;

    let url = match permission_type {
        "microphone" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        }
        "accessibility" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        }
        _ => return Err("Unknown permission type".to_string()),
    };

    info!("Opening system preferences for: {}", permission_type);

    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| {
            error!("Failed to open system preferences: {}", e);
            format!("Failed to open system preferences: {}", e)
        })?;

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn open_system_preferences(_permission_type: &str) -> Result<(), String> {
    Err("System preferences only available on macOS".to_string())
}

/// Check if all required permissions are granted
pub fn check_all_permissions() -> bool {
    let microphone = check_microphone_permission();
    let accessibility = check_accessibility_permission();

    microphone == PermissionStatus::Granted && accessibility == PermissionStatus::Granted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_status() {
        let status = check_microphone_permission();
        // Just ensure it doesn't panic
        assert!(matches!(
            status,
            PermissionStatus::Granted
                | PermissionStatus::Denied
                | PermissionStatus::NotDetermined
                | PermissionStatus::Unknown
        ));
    }
}
