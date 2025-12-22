// Benchmarking and performance testing utilities

use raflow::*;
use std::time::{Duration, Instant};

#[cfg(test)]
mod benchmark_tests {
    use super::*;

    /// Benchmark audio buffer operations
    #[test]
    fn bench_audio_buffer_throughput() {
        let mut buffer = AudioBuffer::new(160000, 1600);
        let samples: Vec<f32> = (0..1600).map(|i| i as f32).collect();

        let iterations = 10000;
        let start = Instant::now();

        for _ in 0..iterations {
            buffer.push_samples(&samples);
            let _ = buffer.pop_chunk();
        }

        let elapsed = start.elapsed();
        let ops_per_sec = iterations as f64 / elapsed.as_secs_f64();

        println!("Audio buffer throughput: {:.2} ops/sec", ops_per_sec);
        println!("Average latency: {:.2}µs", elapsed.as_micros() as f64 / iterations as f64);

        // Should achieve at least 100k ops/sec
        assert!(ops_per_sec > 100_000.0, "Audio buffer throughput too low: {:.2} ops/sec", ops_per_sec);
    }

    /// Benchmark audio resampling performance
    #[test]
    fn bench_audio_resampling() {
        let mut resampler = AudioResampler::new(48000, 16000, 4800).unwrap();
        let input: Vec<f32> = (0..4800).map(|i| (i as f32 / 100.0).sin()).collect();

        let iterations = 1000;
        let start = Instant::now();

        for _ in 0..iterations {
            let _ = resampler.process(&input).unwrap();
        }

        let elapsed = start.elapsed();
        let samples_per_sec = (iterations * 4800) as f64 / elapsed.as_secs_f64();

        println!("Resampling throughput: {:.2} samples/sec", samples_per_sec);
        println!("Processing time per chunk: {:.2}ms", elapsed.as_millis() as f64 / iterations as f64);

        // Should process at least 10x real-time (48kHz * 10 = 480k samples/sec)
        assert!(samples_per_sec > 480_000.0, "Resampling too slow: {:.2} samples/sec", samples_per_sec);
    }

    /// Benchmark VAD detection performance
    #[test]
    fn bench_vad_detection() {
        let mut vad = VoiceActivityDetector::default();
        let audio: Vec<f32> = (0..1600).map(|i| (i as f32 / 10.0).sin() * 0.5).collect();

        let iterations = 10000;
        let start = Instant::now();

        for _ in 0..iterations {
            vad.is_speech(&audio);
        }

        let elapsed = start.elapsed();
        let checks_per_sec = iterations as f64 / elapsed.as_secs_f64();

        println!("VAD throughput: {:.2} checks/sec", checks_per_sec);
        println!("Average check time: {:.2}µs", elapsed.as_micros() as f64 / iterations as f64);

        // Should achieve at least 100k checks/sec
        assert!(checks_per_sec > 100_000.0, "VAD detection too slow: {:.2} checks/sec", checks_per_sec);
    }

    /// Benchmark metrics recording performance
    #[tokio::test]
    async fn bench_metrics_recording() {
        let state = AppState::new();

        let iterations = 100_000;
        let start = Instant::now();

        for i in 0..iterations {
            state.metrics.record_audio_packet_processed(Duration::from_micros(100));
            state.metrics.record_ws_message_sent(100);

            if i % 1000 == 0 {
                let _ = state.metrics.snapshot();
            }
        }

        let elapsed = start.elapsed();
        let ops_per_sec = (iterations * 2) as f64 / elapsed.as_secs_f64(); // 2 ops per iteration

        println!("Metrics recording throughput: {:.2} ops/sec", ops_per_sec);
        println!("Average recording time: {:.2}ns", elapsed.as_nanos() as f64 / (iterations * 2) as f64);

        // Should achieve at least 1M ops/sec (lock-free atomics)
        assert!(ops_per_sec > 1_000_000.0, "Metrics recording too slow: {:.2} ops/sec", ops_per_sec);
    }
}

#[cfg(test)]
mod stress_tests {
    use super::*;
    use tokio::time::sleep;

    /// Stress test: concurrent metrics updates
    #[tokio::test]
    async fn stress_concurrent_metrics() {
        let state = AppState::new();
        let mut handles = vec![];

        // Spawn 50 concurrent tasks
        for _ in 0..50 {
            let state_clone = state.clone();
            let handle = tokio::spawn(async move {
                for _ in 0..10000 {
                    state_clone.metrics.record_audio_packet_processed(Duration::from_micros(100));
                    state_clone.metrics.record_ws_message_sent(100);
                }
            });
            handles.push(handle);
        }

        // Wait for all tasks
        for handle in handles {
            handle.await.unwrap();
        }

        // Verify counts
        let snapshot = state.metrics.snapshot();
        assert_eq!(snapshot.audio_packets_processed, 50 * 10000);
        assert_eq!(snapshot.ws_messages_sent, 50 * 10000);
    }

    /// Stress test: rapid buffer operations
    #[test]
    fn stress_audio_buffer() {
        let mut buffer = AudioBuffer::new(160000, 1600);

        // Rapid push/pop cycles
        for iteration in 0..1000 {
            // Push varying amounts of data
            let size = 1600 + (iteration % 800);
            let samples: Vec<f32> = (0..size).map(|i| i as f32).collect();
            buffer.push_samples(&samples);

            // Try to pop chunks
            while buffer.pop_chunk().is_some() {
                // Keep popping
            }
        }

        // Buffer should still be valid
        assert!(buffer.len() < buffer.capacity());
    }

    /// Stress test: error recovery
    #[tokio::test]
    async fn stress_error_recovery() {
        let policy = RetryPolicy::new().with_max_attempts(3);

        let mut total_retries = 0;

        // Simulate 100 operations with random failures
        for i in 0..100 {
            let mut attempts = 0;
            let result = policy.execute(|| async {
                attempts += 1;
                // Fail 30% of first attempts
                if attempts == 1 && i % 3 == 0 {
                    Err(RAFlowError::Network("Temporary failure".to_string()))
                } else {
                    Ok(())
                }
            }).await;

            assert!(result.is_ok());
            if attempts > 1 {
                total_retries += attempts - 1;
            }
        }

        println!("Total retries across 100 operations: {}", total_retries);
        assert!(total_retries > 0, "Should have had some retries");
        assert!(total_retries < 100, "Too many retries");
    }
}

#[cfg(test)]
mod load_tests {
    use super::*;

    /// Load test: sustained audio processing
    #[tokio::test(flavor = "multi_thread")]
    async fn load_sustained_audio_processing() {
        let state = AppState::new();

        // Simulate 10 seconds of audio processing at 16kHz
        // 16000 samples/sec * 10 sec = 160000 samples
        // With chunks of 1600 samples = 100 chunks

        let start = Instant::now();

        for chunk_num in 0..100 {
            // Simulate processing delay (should be < 10ms per chunk)
            sleep(Duration::from_micros(500)).await;

            // Record metrics
            state.metrics.record_audio_packet_processed(Duration::from_micros(500));
            state.metrics.record_ws_message_sent(1600 * 2);

            // Occasional transcript updates
            if chunk_num % 10 == 0 {
                state.metrics.record_partial_transcript();
            }
        }

        let elapsed = start.elapsed();

        println!("Processed 100 chunks in {:?}", elapsed);

        // Should complete in reasonable time (< 200ms + sleep time)
        assert!(elapsed < Duration::from_millis(300), "Audio processing took too long");

        // Check health
        assert!(state.metrics.is_healthy());
    }

    /// Load test: high-frequency metrics snapshots
    #[tokio::test]
    async fn load_frequent_snapshots() {
        let state = AppState::new();

        // Continuously update metrics
        let state_clone = state.clone();
        let update_handle = tokio::spawn(async move {
            for _ in 0..10000 {
                state_clone.metrics.record_audio_packet_processed(Duration::from_micros(100));
            }
        });

        // Take frequent snapshots while updates are happening
        for _ in 0..100 {
            let _ = state.metrics.snapshot();
            sleep(Duration::from_micros(10)).await;
        }

        update_handle.await.unwrap();

        // Verify final state
        let snapshot = state.metrics.snapshot();
        assert_eq!(snapshot.audio_packets_processed, 10000);
    }
}

/// Memory leak detection test
#[cfg(test)]
mod memory_tests {
    use super::*;

    #[tokio::test]
    async fn test_no_memory_leak_state_cycles() {
        // Create and drop many app states
        for _ in 0..1000 {
            let state = AppState::new();
            *state.is_recording.lock().await = true;
            *state.current_transcript.lock().await = "Test".to_string();
            // State is dropped here
        }

        // If there's a memory leak, this test will show up in tools like valgrind
        // For now, just ensure it completes without panic
    }

    #[test]
    fn test_no_memory_leak_buffer_cycles() {
        // Create and drop many buffers
        for _ in 0..1000 {
            let mut buffer = AudioBuffer::new(16000, 1600);
            let samples: Vec<f32> = (0..8000).map(|i| i as f32).collect();
            buffer.push_samples(&samples);

            while buffer.pop_chunk().is_some() {
                // Drain buffer
            }
            // Buffer is dropped here
        }
    }
}
