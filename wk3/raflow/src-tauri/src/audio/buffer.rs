use std::collections::VecDeque;
use tracing::debug;

/// Optimized audio buffer with fixed capacity and efficient reuse
pub struct AudioBuffer {
    buffer: VecDeque<f32>,
    capacity: usize,
    chunk_size: usize,
}

impl AudioBuffer {
    /// Create a new audio buffer
    ///
    /// # Arguments
    /// * `capacity` - Maximum number of samples to buffer
    /// * `chunk_size` - Size of chunks to process
    pub fn new(capacity: usize, chunk_size: usize) -> Self {
        debug!(
            "Creating audio buffer with capacity: {}, chunk_size: {}",
            capacity, chunk_size
        );

        Self {
            buffer: VecDeque::with_capacity(capacity),
            capacity,
            chunk_size,
        }
    }

    /// Push samples into the buffer
    ///
    /// Returns the number of samples that were dropped due to buffer overflow
    pub fn push(&mut self, samples: &[f32]) -> usize {
        let available = self.capacity - self.buffer.len();
        let to_add = samples.len().min(available);
        let dropped = samples.len() - to_add;

        if dropped > 0 {
            debug!("Audio buffer overflow, dropping {} samples", dropped);
        }

        self.buffer.extend(&samples[..to_add]);
        dropped
    }

    /// Try to get a chunk of the specified size
    ///
    /// Returns None if not enough samples are available
    pub fn pop_chunk(&mut self) -> Option<Vec<f32>> {
        if self.buffer.len() >= self.chunk_size {
            let chunk: Vec<f32> = self.buffer.drain(..self.chunk_size).collect();
            Some(chunk)
        } else {
            None
        }
    }

    /// Get number of complete chunks available
    pub fn available_chunks(&self) -> usize {
        self.buffer.len() / self.chunk_size
    }

    /// Get number of samples in buffer
    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.clear();
    }

    /// Get buffer utilization percentage
    pub fn utilization(&self) -> f64 {
        (self.buffer.len() as f64 / self.capacity as f64) * 100.0
    }
}

/// Batch processor for audio samples
pub struct BatchProcessor {
    batch_size: usize,
    batch: Vec<f32>,
}

impl BatchProcessor {
    pub fn new(batch_size: usize) -> Self {
        Self {
            batch_size,
            batch: Vec::with_capacity(batch_size),
        }
    }

    /// Add samples to the batch
    ///
    /// Returns completed batches
    pub fn add(&mut self, samples: &[f32]) -> Vec<Vec<f32>> {
        let mut batches = Vec::new();

        for &sample in samples {
            self.batch.push(sample);

            if self.batch.len() >= self.batch_size {
                batches.push(self.batch.clone());
                self.batch.clear();
            }
        }

        batches
    }

    /// Flush any remaining samples as a partial batch
    pub fn flush(&mut self) -> Option<Vec<f32>> {
        if !self.batch.is_empty() {
            Some(std::mem::replace(
                &mut self.batch,
                Vec::with_capacity(self.batch_size),
            ))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_buffer_basic() {
        let mut buffer = AudioBuffer::new(100, 10);

        assert_eq!(buffer.len(), 0);
        assert!(buffer.is_empty());

        // Push some samples
        let samples = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let dropped = buffer.push(&samples);
        assert_eq!(dropped, 0);
        assert_eq!(buffer.len(), 5);
    }

    #[test]
    fn test_audio_buffer_chunks() {
        let mut buffer = AudioBuffer::new(100, 10);

        // Push 25 samples
        let samples: Vec<f32> = (0..25).map(|i| i as f32).collect();
        buffer.push(&samples);

        assert_eq!(buffer.available_chunks(), 2);

        // Pop first chunk
        let chunk1 = buffer.pop_chunk();
        assert!(chunk1.is_some());
        assert_eq!(chunk1.unwrap().len(), 10);

        // Pop second chunk
        let chunk2 = buffer.pop_chunk();
        assert!(chunk2.is_some());

        // Can't pop third chunk (only 5 samples left)
        let chunk3 = buffer.pop_chunk();
        assert!(chunk3.is_none());
    }

    #[test]
    fn test_audio_buffer_overflow() {
        let mut buffer = AudioBuffer::new(10, 5);

        // Push more than capacity
        let samples: Vec<f32> = (0..15).map(|i| i as f32).collect();
        let dropped = buffer.push(&samples);

        assert_eq!(dropped, 5);
        assert_eq!(buffer.len(), 10);
    }

    #[test]
    fn test_batch_processor() {
        let mut processor = BatchProcessor::new(5);

        // Add 12 samples (should produce 2 complete batches)
        let samples: Vec<f32> = (0..12).map(|i| i as f32).collect();
        let batches = processor.add(&samples);

        assert_eq!(batches.len(), 2);
        assert_eq!(batches[0].len(), 5);
        assert_eq!(batches[1].len(), 5);

        // Flush remaining 2 samples
        let last_batch = processor.flush();
        assert!(last_batch.is_some());
        assert_eq!(last_batch.unwrap().len(), 2);
    }
}
