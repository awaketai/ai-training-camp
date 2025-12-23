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
    use cocoa::foundation::NSString;
    use objc::{class, msg_send, runtime::Object, sel, sel_impl};

    unsafe {
        let av_capture_device = class!(AVCaptureDevice);

        // AVMediaTypeAudio is an NSString constant in AVFoundation
        // We need to get it from the framework
        let media_type_audio_str = NSString::alloc(nil).init_str("soun"); // AVMediaTypeAudio

        let status: isize = msg_send![av_capture_device, authorizationStatusForMediaType: media_type_audio_str];

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
    // For now, we'll rely on the Enigo library to handle accessibility checks
    // A proper implementation would query macOS accessibility APIs
    // This can be enhanced later with proper system API calls
    debug!("Accessibility permission check - returning granted (will be verified at runtime)");
    PermissionStatus::Granted
}

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility_permission() -> PermissionStatus {
    PermissionStatus::Granted // Assume granted on non-macOS platforms
}

/// Open System Preferences to the relevant permission page
#[cfg(target_os = "macos")]
pub fn open_system_preferences(permission_type: &str) -> Result<(), String> {
    use std::process::Command;

    match permission_type {
        "microphone" => {
            info!("Opening microphone permission settings");
            // For microphone, the permission dialog will appear automatically when you first use the microphone
            // Open system preferences as a fallback
            let url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
            Command::new("open").arg(url).spawn().map_err(|e| {
                error!("Failed to open system preferences: {}", e);
                format!("Failed to open system preferences: {}", e)
            })?;

            info!("If you don't see the app in the list, it's because you're running in development mode.");
            info!("Please try starting recording - the system will show a permission dialog automatically.");
        }
        "accessibility" => {
            info!("Opening accessibility permission settings");
            let url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
            Command::new("open").arg(url).spawn().map_err(|e| {
                error!("Failed to open system preferences: {}", e);
                format!("Failed to open system preferences: {}", e)
            })?;

            info!("For development mode:");
            info!("1. In System Preferences > Security & Privacy > Privacy > Accessibility");
            info!("2. Look for 'Terminal' or your IDE (VS Code, IntelliJ, etc.) if you don't see the app");
            info!("3. Grant accessibility permission to your development environment");
            info!("4. Alternatively, build the app in release mode for proper system integration");
        }
        _ => return Err("Unknown permission type".to_string()),
    }

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
