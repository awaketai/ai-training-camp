pub mod error;
pub mod metrics;
pub mod permissions;

pub use error::{ErrorContext, RAFlowError, RecoveryStrategy, Result};
pub use metrics::{Metrics, PerformanceMetrics};
pub use permissions::{
    check_accessibility_permission, check_microphone_permission, open_system_preferences,
    PermissionStatus,
};
