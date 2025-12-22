use tracing::debug;

/// Voice Activity Detector using simple energy-based approach
pub struct VoiceActivityDetector {
    energy_threshold: f32,
    speech_frames: usize,
    silence_frames: usize,
    min_speech_frames: usize,
    min_silence_frames: usize,
    is_speaking: bool,
}

impl VoiceActivityDetector {
    /// Create a new VAD with specified threshold
    ///
    /// # Arguments
    /// * `threshold` - Energy threshold for speech detection (typically 0.01 - 0.1)
    pub fn new(threshold: f32) -> Self {
        Self {
            energy_threshold: threshold,
            speech_frames: 0,
            silence_frames: 0,
            min_speech_frames: 5,   // ~50ms at 100ms frames
            min_silence_frames: 30, // ~300ms at 100ms frames
            is_speaking: false,
        }
    }

    /// Check if the audio frame contains speech
    ///
    /// # Arguments
    /// * `audio` - Audio samples to analyze
    ///
    /// # Returns
    /// `true` if speech is detected, `false` otherwise
    pub fn is_speech(&mut self, audio: &[f32]) -> bool {
        let rms = self.calculate_rms(audio);

        if rms > self.energy_threshold {
            self.speech_frames += 1;
            self.silence_frames = 0;

            // Start speaking if we have enough speech frames
            if !self.is_speaking && self.speech_frames >= self.min_speech_frames {
                self.is_speaking = true;
                debug!("Speech started (RMS: {:.4})", rms);
            }
        } else {
            self.silence_frames += 1;
            self.speech_frames = 0;

            // Stop speaking if we have enough silence frames
            if self.is_speaking && self.silence_frames >= self.min_silence_frames {
                self.is_speaking = false;
                debug!("Speech ended");
            }
        }

        self.is_speaking
    }

    /// Calculate RMS (Root Mean Square) energy of audio
    fn calculate_rms(&self, audio: &[f32]) -> f32 {
        if audio.is_empty() {
            return 0.0;
        }
        let sum: f32 = audio.iter().map(|x| x * x).sum();
        (sum / audio.len() as f32).sqrt()
    }

    /// Get current speaking state
    pub fn is_currently_speaking(&self) -> bool {
        self.is_speaking
    }

    /// Reset the VAD state
    pub fn reset(&mut self) {
        self.speech_frames = 0;
        self.silence_frames = 0;
        self.is_speaking = false;
    }

    /// Update the energy threshold
    pub fn set_threshold(&mut self, threshold: f32) {
        self.energy_threshold = threshold;
    }

    /// Get current audio level (0.0 - 1.0)
    pub fn get_audio_level(&self, audio: &[f32]) -> f32 {
        let rms = self.calculate_rms(audio);
        (rms * 10.0).min(1.0) // Scale and clamp to 0-1
    }
}

impl Default for VoiceActivityDetector {
    fn default() -> Self {
        Self::new(0.02) // Default threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad_silence() {
        let mut vad = VoiceActivityDetector::new(0.02);
        let silence = vec![0.0; 1600]; // 100ms of silence at 16kHz

        // Should not detect speech in silence
        for _ in 0..10 {
            assert!(!vad.is_speech(&silence));
        }
    }

    #[test]
    fn test_vad_speech() {
        let mut vad = VoiceActivityDetector::new(0.02);

        // Generate loud audio (speech simulation)
        let speech: Vec<f32> = (0..1600)
            .map(|i| 0.1 * (2.0 * std::f32::consts::PI * 200.0 * i as f32 / 16000.0).sin())
            .collect();

        // Should detect speech after min_speech_frames
        let mut detected = false;
        for _ in 0..10 {
            if vad.is_speech(&speech) {
                detected = true;
                break;
            }
        }
        assert!(detected);
    }

    #[test]
    fn test_audio_level() {
        let vad = VoiceActivityDetector::new(0.02);

        let silence = vec![0.0; 160];
        assert_eq!(vad.get_audio_level(&silence), 0.0);

        let loud: Vec<f32> = vec![0.5; 160];
        assert!(vad.get_audio_level(&loud) > 0.0);
    }
}
