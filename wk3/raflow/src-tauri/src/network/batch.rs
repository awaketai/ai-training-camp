use crate::network::ClientMessage;
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use tracing::debug;

/// Message batcher for efficient network transmission
pub struct MessageBatcher {
    batch: VecDeque<ClientMessage>,
    max_batch_size: usize,
    max_batch_age: Duration,
    last_flush: Instant,
}

impl MessageBatcher {
    pub fn new(max_batch_size: usize, max_batch_age: Duration) -> Self {
        Self {
            batch: VecDeque::with_capacity(max_batch_size),
            max_batch_size,
            max_batch_age,
            last_flush: Instant::now(),
        }
    }

    /// Add a message to the batch
    ///
    /// Returns true if the batch should be flushed
    pub fn add(&mut self, message: ClientMessage) -> bool {
        self.batch.push_back(message);

        // Check if batch should be flushed
        self.should_flush()
    }

    /// Check if the batch should be flushed
    pub fn should_flush(&self) -> bool {
        self.batch.len() >= self.max_batch_size
            || self.last_flush.elapsed() >= self.max_batch_age
    }

    /// Get all messages and clear the batch
    pub fn flush(&mut self) -> Vec<ClientMessage> {
        let messages: Vec<ClientMessage> = self.batch.drain(..).collect();
        self.last_flush = Instant::now();

        if !messages.is_empty() {
            debug!("Flushing {} batched messages", messages.len());
        }

        messages
    }

    /// Get current batch size
    pub fn len(&self) -> usize {
        self.batch.len()
    }

    /// Check if batch is empty
    pub fn is_empty(&self) -> bool {
        self.batch.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batcher_size_limit() {
        let mut batcher = MessageBatcher::new(3, Duration::from_secs(10));

        // Add messages
        for i in 0..2 {
            let msg = ClientMessage::audio_chunk(&vec![i as f32]);
            assert!(!batcher.add(msg)); // Should not flush yet
        }

        // Third message should trigger flush
        let msg = ClientMessage::audio_chunk(&vec![2.0]);
        assert!(batcher.add(msg));

        let messages = batcher.flush();
        assert_eq!(messages.len(), 3);
    }

    #[test]
    fn test_batcher_age_limit() {
        let mut batcher = MessageBatcher::new(10, Duration::from_millis(50));

        let msg = ClientMessage::audio_chunk(&vec![1.0]);
        batcher.add(msg);

        // Should not flush immediately
        assert!(!batcher.should_flush());

        // Wait for age limit
        std::thread::sleep(Duration::from_millis(60));

        // Should flush now
        assert!(batcher.should_flush());
    }
}
