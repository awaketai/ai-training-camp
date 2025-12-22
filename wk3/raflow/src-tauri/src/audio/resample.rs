use anyhow::Result;
use rubato::{
    InterpolationParameters, InterpolationType, Resampler, SincFixedIn, WindowFunction,
};
use tracing::debug;

pub struct AudioResampler {
    resampler: SincFixedIn<f32>,
    input_buffer: Vec<Vec<f32>>,
    output_buffer: Vec<Vec<f32>>,
    chunk_size: usize,
}

impl AudioResampler {
    /// Create a new audio resampler
    ///
    /// # Arguments
    /// * `from_rate` - Input sample rate in Hz
    /// * `to_rate` - Output sample rate in Hz
    /// * `chunk_size` - Size of input chunks to process
    pub fn new(from_rate: usize, to_rate: usize, chunk_size: usize) -> Result<Self> {
        let params = InterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: InterpolationType::Linear,
            oversampling_factor: 256,
            window: WindowFunction::BlackmanHarris2,
        };

        let resample_ratio = to_rate as f64 / from_rate as f64;
        let output_chunk_size = (chunk_size as f64 * resample_ratio).ceil() as usize;

        debug!(
            "Creating resampler: {}Hz -> {}Hz, ratio: {:.3}, chunk: {} -> {}",
            from_rate, to_rate, resample_ratio, chunk_size, output_chunk_size
        );

        let resampler = SincFixedIn::<f32>::new(
            resample_ratio,
            2.0,
            params,
            chunk_size,
            1, // mono channel
        )?;

        Ok(Self {
            resampler,
            input_buffer: vec![vec![0.0; chunk_size]; 1],
            output_buffer: vec![vec![0.0; output_chunk_size + chunk_size]; 1],
            chunk_size,
        })
    }

    /// Process an audio chunk and return resampled output
    ///
    /// # Arguments
    /// * `input` - Input audio samples (must match chunk_size)
    ///
    /// # Returns
    /// Resampled audio samples at target sample rate
    pub fn process(&mut self, input: &[f32]) -> Result<Vec<f32>> {
        // Pad input if necessary
        if input.len() < self.chunk_size {
            self.input_buffer[0][..input.len()].copy_from_slice(input);
            self.input_buffer[0][input.len()..].fill(0.0);
        } else {
            self.input_buffer[0].copy_from_slice(&input[..self.chunk_size]);
        }

        let (_, out_len) = self.resampler.process_into_buffer(
            &self.input_buffer,
            &mut self.output_buffer,
            None,
        )?;

        Ok(self.output_buffer[0][..out_len].to_vec())
    }

    /// Get the expected output size for a given input size
    pub fn output_size(&self, input_size: usize) -> usize {
        ((input_size as f64) * self.resampler.output_frames_max() as f64
            / self.chunk_size as f64)
            .ceil() as usize
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resampler_creation() {
        let resampler = AudioResampler::new(48000, 16000, 480);
        assert!(resampler.is_ok());
    }

    #[test]
    fn test_resampling() {
        let mut resampler = AudioResampler::new(48000, 16000, 480).unwrap();

        // Generate test signal (440Hz sine wave)
        let input: Vec<f32> = (0..480)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin())
            .collect();

        let output = resampler.process(&input);
        assert!(output.is_ok());

        let output = output.unwrap();
        // Output should be approximately 1/3 the size (48k->16k)
        assert!(output.len() > 100 && output.len() < 200);
    }
}
