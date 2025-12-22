use std::fmt;
use thiserror::Error;

/// Main error type for RAFlow application
#[derive(Debug, Error)]
pub enum RAFlowError {
    /// Audio device errors
    #[error("Audio device error: {0}")]
    AudioDevice(String),

    /// Audio processing errors
    #[error("Audio processing error: {0}")]
    AudioProcessing(String),

    /// Network connection errors
    #[error("Network error: {0}")]
    Network(String),

    /// WebSocket errors
    #[error("WebSocket error: {0}")]
    WebSocket(String),

    /// Permission denied errors
    #[error("Permission denied: {0}")]
    Permission(String),

    /// API errors
    #[error("API error: {0}")]
    API(String),

    /// Text injection errors
    #[error("Text injection error: {0}")]
    Injection(String),

    /// Configuration errors
    #[error("Configuration error: {0}")]
    Config(String),

    /// State errors
    #[error("State error: {0}")]
    State(String),

    /// Timeout errors
    #[error("Operation timed out: {0}")]
    Timeout(String),

    /// Resource exhausted
    #[error("Resource exhausted: {0}")]
    ResourceExhausted(String),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Internal errors
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Result type alias for RAFlow operations
pub type Result<T> = std::result::Result<T, RAFlowError>;

/// Error context for better error reporting
#[derive(Debug, Clone)]
pub struct ErrorContext {
    pub operation: String,
    pub component: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub retry_count: u32,
}

impl ErrorContext {
    pub fn new(operation: impl Into<String>, component: impl Into<String>) -> Self {
        Self {
            operation: operation.into(),
            component: component.into(),
            timestamp: chrono::Utc::now(),
            retry_count: 0,
        }
    }

    pub fn with_retry(mut self, count: u32) -> Self {
        self.retry_count = count;
        self
    }
}

impl fmt::Display for ErrorContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "[{}] {} in {} (retry: {})",
            self.timestamp.format("%Y-%m-%d %H:%M:%S"),
            self.operation,
            self.component,
            self.retry_count
        )
    }
}

/// Error recovery strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecoveryStrategy {
    /// Retry the operation
    Retry,
    /// Reset the component
    Reset,
    /// Fallback to alternative
    Fallback,
    /// Fail and report
    Fail,
}

impl RAFlowError {
    /// Determine the appropriate recovery strategy for this error
    pub fn recovery_strategy(&self) -> RecoveryStrategy {
        match self {
            RAFlowError::Network(_) | RAFlowError::WebSocket(_) => RecoveryStrategy::Retry,
            RAFlowError::AudioDevice(_) => RecoveryStrategy::Reset,
            RAFlowError::Permission(_) => RecoveryStrategy::Fail,
            RAFlowError::API(_) => RecoveryStrategy::Retry,
            RAFlowError::Timeout(_) => RecoveryStrategy::Retry,
            RAFlowError::ResourceExhausted(_) => RecoveryStrategy::Reset,
            RAFlowError::InvalidInput(_) => RecoveryStrategy::Fail,
            _ => RecoveryStrategy::Fail,
        }
    }

    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self.recovery_strategy(),
            RecoveryStrategy::Retry | RecoveryStrategy::Reset
        )
    }

    /// Get max retry count for this error type
    pub fn max_retries(&self) -> u32 {
        match self {
            RAFlowError::Network(_) | RAFlowError::WebSocket(_) => 3,
            RAFlowError::API(_) => 2,
            RAFlowError::Timeout(_) => 2,
            _ => 0,
        }
    }
}

// Conversions from other error types
impl From<anyhow::Error> for RAFlowError {
    fn from(err: anyhow::Error) -> Self {
        RAFlowError::Internal(err.to_string())
    }
}

impl From<std::io::Error> for RAFlowError {
    fn from(err: std::io::Error) -> Self {
        RAFlowError::Internal(format!("IO error: {}", err))
    }
}

impl From<serde_json::Error> for RAFlowError {
    fn from(err: serde_json::Error) -> Self {
        RAFlowError::Config(format!("JSON error: {}", err))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_recovery_strategy() {
        let net_err = RAFlowError::Network("connection failed".to_string());
        assert_eq!(net_err.recovery_strategy(), RecoveryStrategy::Retry);
        assert!(net_err.is_retryable());

        let perm_err = RAFlowError::Permission("denied".to_string());
        assert_eq!(perm_err.recovery_strategy(), RecoveryStrategy::Fail);
        assert!(!perm_err.is_retryable());
    }

    #[test]
    fn test_error_context() {
        let ctx = ErrorContext::new("test_operation", "test_component");
        assert_eq!(ctx.operation, "test_operation");
        assert_eq!(ctx.component, "test_component");
        assert_eq!(ctx.retry_count, 0);

        let ctx_retry = ctx.with_retry(2);
        assert_eq!(ctx_retry.retry_count, 2);
    }
}
