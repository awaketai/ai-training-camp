use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};

/// Performance metrics tracker
#[derive(Debug, Clone)]
pub struct Metrics {
    inner: Arc<MetricsInner>,
}

#[derive(Debug)]
struct MetricsInner {
    // Audio metrics
    audio_packets_processed: AtomicU64,
    audio_packets_dropped: AtomicU64,
    audio_processing_time_us: AtomicU64,

    // Network metrics
    ws_messages_sent: AtomicU64,
    ws_messages_received: AtomicU64,
    ws_bytes_sent: AtomicU64,
    ws_bytes_received: AtomicU64,
    ws_reconnects: AtomicU64,

    // Transcription metrics
    partial_transcripts: AtomicU64,
    committed_transcripts: AtomicU64,
    transcript_latency_ms: AtomicU64,

    // System metrics
    memory_usage_mb: AtomicUsize,
    cpu_usage_percent: AtomicUsize,

    // Error metrics
    errors_total: AtomicU64,
    errors_retried: AtomicU64,
    errors_recovered: AtomicU64,

    start_time: Instant,
}

impl Metrics {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(MetricsInner {
                audio_packets_processed: AtomicU64::new(0),
                audio_packets_dropped: AtomicU64::new(0),
                audio_processing_time_us: AtomicU64::new(0),
                ws_messages_sent: AtomicU64::new(0),
                ws_messages_received: AtomicU64::new(0),
                ws_bytes_sent: AtomicU64::new(0),
                ws_bytes_received: AtomicU64::new(0),
                ws_reconnects: AtomicU64::new(0),
                partial_transcripts: AtomicU64::new(0),
                committed_transcripts: AtomicU64::new(0),
                transcript_latency_ms: AtomicU64::new(0),
                memory_usage_mb: AtomicUsize::new(0),
                cpu_usage_percent: AtomicUsize::new(0),
                errors_total: AtomicU64::new(0),
                errors_retried: AtomicU64::new(0),
                errors_recovered: AtomicU64::new(0),
                start_time: Instant::now(),
            }),
        }
    }

    // Audio metrics
    pub fn record_audio_packet_processed(&self, processing_time: Duration) {
        self.inner
            .audio_packets_processed
            .fetch_add(1, Ordering::Relaxed);
        self.inner
            .audio_processing_time_us
            .fetch_add(processing_time.as_micros() as u64, Ordering::Relaxed);
    }

    pub fn record_audio_packet_dropped(&self) {
        self.inner
            .audio_packets_dropped
            .fetch_add(1, Ordering::Relaxed);
    }

    // Network metrics
    pub fn record_ws_message_sent(&self, bytes: usize) {
        self.inner.ws_messages_sent.fetch_add(1, Ordering::Relaxed);
        self.inner
            .ws_bytes_sent
            .fetch_add(bytes as u64, Ordering::Relaxed);
    }

    pub fn record_ws_message_received(&self, bytes: usize) {
        self.inner
            .ws_messages_received
            .fetch_add(1, Ordering::Relaxed);
        self.inner
            .ws_bytes_received
            .fetch_add(bytes as u64, Ordering::Relaxed);
    }

    pub fn record_ws_reconnect(&self) {
        self.inner.ws_reconnects.fetch_add(1, Ordering::Relaxed);
    }

    // Transcription metrics
    pub fn record_partial_transcript(&self) {
        self.inner
            .partial_transcripts
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_committed_transcript(&self, latency: Duration) {
        self.inner
            .committed_transcripts
            .fetch_add(1, Ordering::Relaxed);
        self.inner
            .transcript_latency_ms
            .store(latency.as_millis() as u64, Ordering::Relaxed);
    }

    // Error metrics
    pub fn record_error(&self) {
        self.inner.errors_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_error_retry(&self) {
        self.inner.errors_retried.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_error_recovered(&self) {
        self.inner
            .errors_recovered
            .fetch_add(1, Ordering::Relaxed);
    }

    // System metrics
    pub fn update_memory_usage(&self, mb: usize) {
        self.inner.memory_usage_mb.store(mb, Ordering::Relaxed);
    }

    pub fn update_cpu_usage(&self, percent: usize) {
        self.inner.cpu_usage_percent.store(percent, Ordering::Relaxed);
    }

    /// Get current performance snapshot
    pub fn snapshot(&self) -> PerformanceMetrics {
        let uptime = self.inner.start_time.elapsed();

        let audio_packets_processed = self.inner.audio_packets_processed.load(Ordering::Relaxed);
        let audio_packets_dropped = self.inner.audio_packets_dropped.load(Ordering::Relaxed);
        let audio_processing_time_us =
            self.inner.audio_processing_time_us.load(Ordering::Relaxed);

        // Calculate average processing time
        let avg_audio_processing_us = if audio_packets_processed > 0 {
            audio_processing_time_us / audio_packets_processed
        } else {
            0
        };

        // Calculate drop rate
        let audio_drop_rate = if audio_packets_processed > 0 {
            (audio_packets_dropped as f64 / audio_packets_processed as f64) * 100.0
        } else {
            0.0
        };

        PerformanceMetrics {
            uptime_secs: uptime.as_secs(),
            audio_packets_processed,
            audio_packets_dropped,
            audio_drop_rate,
            avg_audio_processing_us,
            ws_messages_sent: self.inner.ws_messages_sent.load(Ordering::Relaxed),
            ws_messages_received: self.inner.ws_messages_received.load(Ordering::Relaxed),
            ws_bytes_sent: self.inner.ws_bytes_sent.load(Ordering::Relaxed),
            ws_bytes_received: self.inner.ws_bytes_received.load(Ordering::Relaxed),
            ws_reconnects: self.inner.ws_reconnects.load(Ordering::Relaxed),
            partial_transcripts: self.inner.partial_transcripts.load(Ordering::Relaxed),
            committed_transcripts: self.inner.committed_transcripts.load(Ordering::Relaxed),
            transcript_latency_ms: self.inner.transcript_latency_ms.load(Ordering::Relaxed),
            memory_usage_mb: self.inner.memory_usage_mb.load(Ordering::Relaxed),
            cpu_usage_percent: self.inner.cpu_usage_percent.load(Ordering::Relaxed),
            errors_total: self.inner.errors_total.load(Ordering::Relaxed),
            errors_retried: self.inner.errors_retried.load(Ordering::Relaxed),
            errors_recovered: self.inner.errors_recovered.load(Ordering::Relaxed),
        }
    }

    /// Log current metrics
    pub fn log_metrics(&self) {
        let metrics = self.snapshot();

        info!("=== Performance Metrics ===");
        info!("Uptime: {}s", metrics.uptime_secs);
        info!(
            "Audio: {} processed, {} dropped ({:.2}% drop rate)",
            metrics.audio_packets_processed, metrics.audio_packets_dropped, metrics.audio_drop_rate
        );
        info!(
            "Audio processing: {}μs avg",
            metrics.avg_audio_processing_us
        );
        info!(
            "WebSocket: {} sent, {} received, {} reconnects",
            metrics.ws_messages_sent, metrics.ws_messages_received, metrics.ws_reconnects
        );
        info!(
            "Transcripts: {} partial, {} committed, {}ms latency",
            metrics.partial_transcripts, metrics.committed_transcripts, metrics.transcript_latency_ms
        );
        info!(
            "System: {} MB memory, {}% CPU",
            metrics.memory_usage_mb, metrics.cpu_usage_percent
        );
        info!(
            "Errors: {} total, {} retried, {} recovered",
            metrics.errors_total, metrics.errors_retried, metrics.errors_recovered
        );

        // Check thresholds and warn if needed
        if metrics.audio_drop_rate > 1.0 {
            warn!("High audio drop rate: {:.2}%", metrics.audio_drop_rate);
        }
        if metrics.transcript_latency_ms > 500 {
            warn!("High transcript latency: {}ms", metrics.transcript_latency_ms);
        }
        if metrics.memory_usage_mb > 100 {
            warn!("High memory usage: {} MB", metrics.memory_usage_mb);
        }
    }

    /// Check if performance is healthy
    pub fn is_healthy(&self) -> bool {
        let metrics = self.snapshot();

        // Define health criteria
        metrics.audio_drop_rate < 5.0
            && metrics.transcript_latency_ms < 1000
            && metrics.memory_usage_mb < 150
    }
}

impl Default for Metrics {
    fn default() -> Self {
        Self::new()
    }
}

/// Performance metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub uptime_secs: u64,
    pub audio_packets_processed: u64,
    pub audio_packets_dropped: u64,
    pub audio_drop_rate: f64,
    pub avg_audio_processing_us: u64,
    pub ws_messages_sent: u64,
    pub ws_messages_received: u64,
    pub ws_bytes_sent: u64,
    pub ws_bytes_received: u64,
    pub ws_reconnects: u64,
    pub partial_transcripts: u64,
    pub committed_transcripts: u64,
    pub transcript_latency_ms: u64,
    pub memory_usage_mb: usize,
    pub cpu_usage_percent: usize,
    pub errors_total: u64,
    pub errors_retried: u64,
    pub errors_recovered: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_recording() {
        let metrics = Metrics::new();

        metrics.record_audio_packet_processed(Duration::from_micros(100));
        metrics.record_audio_packet_processed(Duration::from_micros(200));
        metrics.record_audio_packet_dropped();

        let snapshot = metrics.snapshot();
        assert_eq!(snapshot.audio_packets_processed, 2);
        assert_eq!(snapshot.audio_packets_dropped, 1);
        assert_eq!(snapshot.avg_audio_processing_us, 150);
    }

    #[test]
    fn test_health_check() {
        let metrics = Metrics::new();
        assert!(metrics.is_healthy());

        // Simulate many drops
        for _ in 0..100 {
            metrics.record_audio_packet_dropped();
        }
        assert!(!metrics.is_healthy());
    }
}
