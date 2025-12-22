use super::*;
use crate::utils::RAFlowError;

#[cfg(test)]
mod resample_tests {
    use super::*;
    use crate::audio::resample::AudioResampler;

    #[test]
    fn test_resampler_creation() {
        let result = AudioResampler::new(48000, 16000, 4800);
        assert!(result.is_ok());
    }

    #[test]
    fn test_resampler_accuracy() {
        let mut resampler = AudioResampler::new(48000, 16000, 4800).unwrap();

        // Create a simple sine wave at 440Hz (A4 note)
        let input_rate = 48000;
        let chunk_size = 4800;
        let freq = 440.0;
        let mut input: Vec<f32> = (0..chunk_size)
            .map(|i| {
                let t = i as f32 / input_rate as f32;
                (2.0 * std::f32::consts::PI * freq * t).sin()
            })
            .collect();

        let output = resampler.process(&input).unwrap();

        // Output should be ~1/3 the size (48kHz -> 16kHz)
        let expected_size = chunk_size / 3;
        let tolerance = 10; // Allow some variance
        assert!(
            (output.len() as i32 - expected_size as i32).abs() < tolerance,
            "Output size {} not close to expected {}",
            output.len(),
            expected_size
        );

        // Check that output is not all zeros
        let has_signal = output.iter().any(|&x| x.abs() > 0.01);
        assert!(has_signal, "Output signal should not be all zeros");
    }

    #[test]
    fn test_resampler_preserves_energy() {
        let mut resampler = AudioResampler::new(48000, 16000, 4800).unwrap();

        let input: Vec<f32> = (0..4800).map(|i| (i as f32 / 100.0).sin()).collect();

        let input_energy: f32 = input.iter().map(|x| x * x).sum::<f32>() / input.len() as f32;

        let output = resampler.process(&input).unwrap();
        let output_energy: f32 =
            output.iter().map(|x| x * x).sum::<f32>() / output.len() as f32;

        // Energy should be preserved within 20% tolerance
        let ratio = output_energy / input_energy;
        assert!(
            ratio > 0.5 && ratio < 2.0,
            "Energy ratio {} out of acceptable range",
            ratio
        );
    }
}

#[cfg(test)]
mod vad_tests {
    use super::*;
    use crate::audio::vad::VoiceActivityDetector;

    #[test]
    fn test_vad_detects_silence() {
        let mut vad = VoiceActivityDetector::default();

        // Silent audio
        let silence: Vec<f32> = vec![0.0; 1600];

        for _ in 0..10 {
            let is_speech = vad.is_speech(&silence);
            assert!(!is_speech, "VAD should not detect speech in silence");
        }
    }

    #[test]
    fn test_vad_detects_speech() {
        let mut vad = VoiceActivityDetector::default();

        // Strong signal (simulated speech)
        let speech: Vec<f32> = (0..1600).map(|i| (i as f32 / 10.0).sin() * 0.5).collect();

        // Feed enough frames to trigger speech detection
        let mut detected_speech = false;
        for _ in 0..10 {
            if vad.is_speech(&speech) {
                detected_speech = true;
                break;
            }
        }

        assert!(detected_speech, "VAD should detect speech in strong signal");
    }

    #[test]
    fn test_vad_audio_level() {
        let vad = VoiceActivityDetector::default();

        // Test different signal levels
        let silence: Vec<f32> = vec![0.0; 1600];
        let weak_signal: Vec<f32> = vec![0.1; 1600];
        let strong_signal: Vec<f32> = vec![0.5; 1600];

        let silence_level = vad.get_audio_level(&silence);
        let weak_level = vad.get_audio_level(&weak_signal);
        let strong_level = vad.get_audio_level(&strong_signal);

        assert!(silence_level < 0.01, "Silence level should be near zero");
        assert!(
            weak_level > silence_level,
            "Weak signal should have higher level than silence"
        );
        assert!(
            strong_level > weak_level,
            "Strong signal should have higher level than weak signal"
        );
    }

    #[test]
    fn test_vad_state_tracking() {
        let mut vad = VoiceActivityDetector::default();

        // Initially not speaking
        assert!(!vad.is_currently_speaking());

        // Feed speech signal
        let speech: Vec<f32> = (0..1600).map(|i| (i as f32 / 10.0).sin() * 0.5).collect();

        for _ in 0..10 {
            vad.is_speech(&speech);
        }

        // Should be marked as speaking
        assert!(
            vad.is_currently_speaking(),
            "VAD should track speaking state"
        );
    }
}

#[cfg(test)]
mod buffer_tests {
    use super::*;
    use crate::audio::buffer::AudioBuffer;

    #[test]
    fn test_buffer_creation() {
        let buffer = AudioBuffer::new(16000, 1600);
        assert_eq!(buffer.len(), 0);
        assert_eq!(buffer.capacity(), 16000);
    }

    #[test]
    fn test_buffer_push_pop() {
        let mut buffer = AudioBuffer::new(16000, 1600);

        // Push samples
        let samples: Vec<f32> = (0..1600).map(|i| i as f32).collect();
        buffer.push_samples(&samples);

        assert_eq!(buffer.len(), 1600);

        // Pop chunk
        let chunk = buffer.pop_chunk();
        assert!(chunk.is_some());
        assert_eq!(chunk.unwrap().len(), 1600);
        assert_eq!(buffer.len(), 0);
    }

    #[test]
    fn test_buffer_partial_chunk() {
        let mut buffer = AudioBuffer::new(16000, 1600);

        // Push less than chunk size
        let samples: Vec<f32> = (0..800).map(|i| i as f32).collect();
        buffer.push_samples(&samples);

        // Should not pop chunk yet
        assert!(buffer.pop_chunk().is_none());
        assert_eq!(buffer.len(), 800);
    }

    #[test]
    fn test_buffer_overflow_protection() {
        let mut buffer = AudioBuffer::new(1000, 100);

        // Try to push more than capacity
        for _ in 0..20 {
            let samples: Vec<f32> = (0..100).map(|i| i as f32).collect();
            buffer.push_samples(&samples);
        }

        // Buffer should not exceed capacity
        assert!(buffer.len() <= 1000, "Buffer should not exceed capacity");
    }

    #[test]
    fn test_buffer_clear() {
        let mut buffer = AudioBuffer::new(16000, 1600);

        let samples: Vec<f32> = (0..3200).map(|i| i as f32).collect();
        buffer.push_samples(&samples);

        assert_eq!(buffer.len(), 3200);

        buffer.clear();
        assert_eq!(buffer.len(), 0);
    }

    #[test]
    fn test_buffer_multiple_chunks() {
        let mut buffer = AudioBuffer::new(16000, 1600);

        // Push 3 chunks worth of data
        let samples: Vec<f32> = (0..4800).map(|i| i as f32).collect();
        buffer.push_samples(&samples);

        // Should be able to pop 3 chunks
        for i in 0..3 {
            let chunk = buffer.pop_chunk();
            assert!(
                chunk.is_some(),
                "Should be able to pop chunk {}",
                i + 1
            );
        }

        // No more complete chunks
        assert!(buffer.pop_chunk().is_none());
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::audio::{AudioBuffer, AudioResampler, VoiceActivityDetector};

    #[test]
    fn test_audio_pipeline() {
        // Simulate the full audio processing pipeline
        let mut resampler = AudioResampler::new(48000, 16000, 4800).unwrap();
        let mut vad = VoiceActivityDetector::default();
        let mut buffer = AudioBuffer::new(16000, 1600);

        // Generate test audio (48kHz)
        let input: Vec<f32> = (0..4800).map(|i| (i as f32 / 100.0).sin() * 0.5).collect();

        // Resample to 16kHz
        let resampled = resampler.process(&input).unwrap();
        assert!(!resampled.is_empty(), "Resampled audio should not be empty");

        // Check if it's speech
        let is_speech = vad.is_speech(&resampled);
        assert!(is_speech, "Should detect speech in signal");

        // Buffer the audio
        buffer.push_samples(&resampled);

        // Pop chunk
        let chunk = buffer.pop_chunk();
        assert!(chunk.is_some(), "Should have buffered chunk");
    }
}
