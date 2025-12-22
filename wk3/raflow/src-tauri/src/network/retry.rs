use crate::utils::RAFlowError;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, warn};

/// Retry policy with exponential backoff
#[derive(Debug, Clone)]
pub struct RetryPolicy {
    max_attempts: u32,
    initial_delay: Duration,
    max_delay: Duration,
    multiplier: f64,
}

impl RetryPolicy {
    pub fn new() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(10),
            multiplier: 2.0,
        }
    }

    pub fn with_max_attempts(mut self, max_attempts: u32) -> Self {
        self.max_attempts = max_attempts;
        self
    }

    pub fn with_initial_delay(mut self, delay: Duration) -> Self {
        self.initial_delay = delay;
        self
    }

    /// Execute an async operation with retry logic
    pub async fn execute<F, Fut, T>(&self, operation: F) -> Result<T, RAFlowError>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, RAFlowError>>,
    {
        let mut attempt = 0;
        let mut delay = self.initial_delay;

        loop {
            attempt += 1;

            match operation().await {
                Ok(result) => {
                    if attempt > 1 {
                        debug!("Operation succeeded after {} attempts", attempt);
                    }
                    return Ok(result);
                }
                Err(err) => {
                    if attempt >= self.max_attempts || !err.is_retryable() {
                        warn!(
                            "Operation failed after {} attempts: {}",
                            attempt, err
                        );
                        return Err(err);
                    }

                    warn!(
                        "Operation failed (attempt {}/{}): {}, retrying in {:?}",
                        attempt, self.max_attempts, err, delay
                    );

                    sleep(delay).await;

                    // Exponential backoff
                    delay = Duration::from_millis(
                        ((delay.as_millis() as f64) * self.multiplier) as u64,
                    )
                    .min(self.max_delay);
                }
            }
        }
    }

    /// Execute a blocking operation with retry logic
    pub fn execute_blocking<F, T>(&self, operation: F) -> Result<T, RAFlowError>
    where
        F: Fn() -> Result<T, RAFlowError>,
    {
        let mut attempt = 0;
        let mut delay = self.initial_delay;

        loop {
            attempt += 1;

            match operation() {
                Ok(result) => {
                    if attempt > 1 {
                        debug!("Operation succeeded after {} attempts", attempt);
                    }
                    return Ok(result);
                }
                Err(err) => {
                    if attempt >= self.max_attempts || !err.is_retryable() {
                        warn!(
                            "Operation failed after {} attempts: {}",
                            attempt, err
                        );
                        return Err(err);
                    }

                    warn!(
                        "Operation failed (attempt {}/{}): {}, retrying in {:?}",
                        attempt, self.max_attempts, err, delay
                    );

                    std::thread::sleep(delay);

                    // Exponential backoff
                    delay = Duration::from_millis(
                        ((delay.as_millis() as f64) * self.multiplier) as u64,
                    )
                    .min(self.max_delay);
                }
            }
        }
    }
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_retry_success() {
        let policy = RetryPolicy::new().with_max_attempts(3);
        let mut attempts = 0;

        let result = policy
            .execute(|| async {
                attempts += 1;
                if attempts < 2 {
                    Err(RAFlowError::Network("Temporary error".to_string()))
                } else {
                    Ok(42)
                }
            })
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 42);
        assert_eq!(attempts, 2);
    }

    #[tokio::test]
    async fn test_retry_max_attempts() {
        let policy = RetryPolicy::new().with_max_attempts(2);
        let mut attempts = 0;

        let result = policy
            .execute(|| async {
                attempts += 1;
                Err(RAFlowError::Network("Persistent error".to_string()))
            })
            .await;

        assert!(result.is_err());
        assert_eq!(attempts, 2);
    }

    #[tokio::test]
    async fn test_retry_non_retryable() {
        let policy = RetryPolicy::new();
        let mut attempts = 0;

        let result = policy
            .execute(|| async {
                attempts += 1;
                Err(RAFlowError::Permission("Access denied".to_string()))
            })
            .await;

        assert!(result.is_err());
        assert_eq!(attempts, 1); // Should not retry
    }
}
