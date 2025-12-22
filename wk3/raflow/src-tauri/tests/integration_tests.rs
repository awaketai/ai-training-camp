// Integration tests for RAFlow

use raflow::*;
use std::time::Duration;
use tokio::time::sleep;

#[cfg(test)]
mod state_tests {
    use super::*;

    #[tokio::test]
    async fn test_app_state_creation() {
        let state = AppState::new();

        // Verify initial state
        assert!(!*state.is_recording.lock().await);
        assert!(state.current_transcript.lock().await.is_empty());
        assert!(state.api_key.lock().await.is_none());
    }

    #[tokio::test]
    async fn test_app_state_clone() {
        let state1 = AppState::new();
        let state2 = state1.clone();

        // Both should share the same underlying data
        *state1.is_recording.lock().await = true;
        assert!(*state2.is_recording.lock().await);
    }

    #[tokio::test]
    async fn test_metrics_integration() {
        let state = AppState::new();

        // Record some metrics
        state.metrics.record_audio_packet_processed(Duration::from_micros(100));
        state.metrics.record_audio_packet_dropped();
        state.metrics.record_ws_message_sent(100);

        // Get snapshot
        let snapshot = state.metrics.snapshot();

        assert_eq!(snapshot.audio_packets_processed, 1);
        assert_eq!(snapshot.audio_packets_dropped, 1);
        assert_eq!(snapshot.ws_messages_sent, 1);
    }
}

#[cfg(test)]
mod error_recovery_tests {
    use super::*;
    use raflow::RAFlowError;

    #[test]
    fn test_error_recovery_strategies() {
        // Network errors should retry
        let network_err = RAFlowError::Network("Connection failed".to_string());
        assert!(network_err.is_retryable());
        assert!(matches!(
            network_err.recovery_strategy(),
            raflow::RecoveryStrategy::Retry
        ));

        // Permission errors should fail
        let permission_err = RAFlowError::Permission("Access denied".to_string());
        assert!(!permission_err.is_retryable());
        assert!(matches!(
            permission_err.recovery_strategy(),
            raflow::RecoveryStrategy::Fail
        ));

        // Audio device errors should reset
        let audio_err = RAFlowError::AudioDevice("Device not found".to_string());
        assert!(audio_err.is_retryable());
        assert!(matches!(
            audio_err.recovery_strategy(),
            raflow::RecoveryStrategy::Reset
        ));
    }

    #[tokio::test]
    async fn test_retry_policy_execution() {
        use raflow::RetryPolicy;

        let policy = RetryPolicy::new().with_max_attempts(3);

        let mut attempts = 0;
        let result = policy
            .execute(|| async {
                attempts += 1;
                if attempts < 2 {
                    Err(RAFlowError::Network("Temporary failure".to_string()))
                } else {
                    Ok(42)
                }
            })
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 42);
        assert_eq!(attempts, 2);
    }
}

#[cfg(test)]
mod performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_metrics_performance() {
        let state = AppState::new();

        // Record 10000 metrics operations (should be fast due to atomics)
        let start = std::time::Instant::now();

        for _ in 0..10000 {
            state.metrics.record_audio_packet_processed(Duration::from_micros(100));
            state.metrics.record_ws_message_sent(100);
        }

        let elapsed = start.elapsed();

        // Should complete in less than 100ms
        assert!(
            elapsed.as_millis() < 100,
            "Metrics recording took too long: {:?}",
            elapsed
        );

        // Verify counts
        let snapshot = state.metrics.snapshot();
        assert_eq!(snapshot.audio_packets_processed, 10000);
        assert_eq!(snapshot.ws_messages_sent, 10000);
    }

    #[tokio::test]
    async fn test_concurrent_metrics_updates() {
        let state = AppState::new();
        let mut handles = vec![];

        // Spawn 10 concurrent tasks updating metrics
        for _ in 0..10 {
            let state_clone = state.clone();
            let handle = tokio::spawn(async move {
                for _ in 0..1000 {
                    state_clone.metrics.record_audio_packet_processed(Duration::from_micros(100));
                }
            });
            handles.push(handle);
        }

        // Wait for all tasks
        for handle in handles {
            handle.await.unwrap();
        }

        // Should have recorded 10 * 1000 = 10000 packets
        let snapshot = state.metrics.snapshot();
        assert_eq!(snapshot.audio_packets_processed, 10000);
    }

    #[test]
    fn test_audio_buffer_performance() {
        use raflow::AudioBuffer;

        let mut buffer = AudioBuffer::new(160000, 1600); // Large buffer

        let start = std::time::Instant::now();

        // Push and pop 1000 chunks
        for _ in 0..1000 {
            let samples: Vec<f32> = (0..1600).map(|i| i as f32).collect();
            buffer.push_samples(&samples);
            let _ = buffer.pop_chunk();
        }

        let elapsed = start.elapsed();

        // Should complete in less than 10ms
        assert!(
            elapsed.as_millis() < 10,
            "Buffer operations took too long: {:?}",
            elapsed
        );
    }
}

#[cfg(test)]
mod integration_workflow_tests {
    use super::*;

    #[tokio::test]
    async fn test_basic_workflow() {
        // 1. Create app state
        let state = AppState::new();

        // 2. Set API key
        *state.api_key.lock().await = Some("test-key".to_string());

        // 3. Start "recording" (just set flag for test)
        *state.is_recording.lock().await = true;

        // 4. Simulate receiving a transcript
        *state.current_transcript.lock().await = "Hello World".to_string();

        // 5. Verify state
        assert!(*state.is_recording.lock().await);
        assert_eq!(*state.current_transcript.lock().await, "Hello World");

        // 6. Stop recording
        *state.is_recording.lock().await = false;
        *state.current_transcript.lock().await = String::new();

        // 7. Verify cleanup
        assert!(!*state.is_recording.lock().await);
        assert!(state.current_transcript.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_health_check_workflow() {
        let state = AppState::new();

        // Initially healthy
        assert!(state.metrics.is_healthy());

        // Simulate high drop rate
        for _ in 0..1000 {
            state.metrics.record_audio_packet_processed(Duration::from_micros(100));
        }
        for _ in 0..20 {
            state.metrics.record_audio_packet_dropped();
        }

        // Should still be healthy (drop rate = 2%)
        let snapshot = state.metrics.snapshot();
        assert!(snapshot.audio_drop_rate < 5.0);
        assert!(state.metrics.is_healthy());

        // Simulate very high drop rate
        for _ in 0..100 {
            state.metrics.record_audio_packet_dropped();
        }

        // Should now be unhealthy
        let snapshot = state.metrics.snapshot();
        assert!(snapshot.audio_drop_rate > 5.0);
    }
}
