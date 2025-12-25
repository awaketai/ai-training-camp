use anyhow::{anyhow, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Stream, StreamConfig};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::{debug, error, info};

pub type AudioPacket = Vec<f32>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub name: String,
    pub is_default: bool,
}

pub struct AudioCapture {
    host: Host,
    device: Option<Device>,
    config: Option<StreamConfig>,
    stream: Option<Stream>,
}

impl AudioCapture {
    pub fn new() -> Result<Self> {
        let host = cpal::default_host();
        info!("Initialized audio host: {:?}", host.id());
        Ok(Self {
            host,
            device: None,
            config: None,
            stream: None,
        })
    }

    /// List all available input audio devices
    pub fn list_devices(&self) -> Result<Vec<DeviceInfo>> {
        let mut devices = Vec::new();
        let default_device = self.host.default_input_device();
        let default_name = default_device
            .as_ref()
            .and_then(|d| d.name().ok());

        for device in self.host.input_devices()? {
            if let Ok(name) = device.name() {
                let is_default = default_name.as_ref().map_or(false, |dn| dn == &name);
                devices.push(DeviceInfo { name, is_default });
            }
        }

        debug!("Found {} input devices", devices.len());
        Ok(devices)
    }

    /// Set the audio device by name
    pub fn set_device(&mut self, device_name: &str) -> Result<()> {
        for device in self.host.input_devices()? {
            if let Ok(name) = device.name() {
                if name == device_name {
                    let config = device.default_input_config()?;
                    info!(
                        "Selected device: {} with config: {:?}",
                        device_name, config
                    );

                    // Convert to StreamConfig
                    self.config = Some(config.config());
                    self.device = Some(device);
                    return Ok(());
                }
            }
        }
        Err(anyhow!("Device not found: {}", device_name))
    }

    /// Use the default input device
    pub fn use_default_device(&mut self) -> Result<()> {
        let device = self
            .host
            .default_input_device()
            .ok_or_else(|| anyhow!("No default input device available"))?;

        let name = device.name()?;
        let config = device.default_input_config()?;

        info!("Using default device: {} with config: {:?}", name, config);

        self.config = Some(config.config());
        self.device = Some(device);
        Ok(())
    }

    /// Start capturing audio and send packets to the channel
    pub fn start_stream(&mut self, tx: mpsc::Sender<AudioPacket>) -> Result<()> {
        let device = self
            .device
            .as_ref()
            .ok_or_else(|| anyhow!("No device selected"))?;

        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow!("No config available"))?;

        let channels = config.channels as usize;

        info!(
            "Starting audio stream with sample rate: {} Hz, channels: {}",
            config.sample_rate, channels
        );

        // Diagnostic counter for stereo-to-mono analysis
        use std::sync::atomic::{AtomicU64, Ordering};
        use std::sync::Arc;
        let packet_counter = Arc::new(AtomicU64::new(0));
        let packet_counter_clone = packet_counter.clone();

        let stream = device.build_input_stream(
            config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let packet_num = packet_counter_clone.fetch_add(1, Ordering::Relaxed);

                // Convert to mono if stereo by averaging channels
                let mono_data: Vec<f32> = if channels == 2 {
                    // Diagnostic: analyze stereo channels every 100 packets
                    if packet_num % 100 == 0 && !data.is_empty() {
                        // Extract left and right channels
                        let left: Vec<f32> = data.chunks(2).map(|chunk| chunk[0]).collect();
                        let right: Vec<f32> = data.chunks(2).map(|chunk| chunk.get(1).copied().unwrap_or(0.0)).collect();

                        // Calculate RMS for each channel
                        let left_rms = (left.iter().map(|x| x * x).sum::<f32>() / left.len() as f32).sqrt();
                        let right_rms = (right.iter().map(|x| x * x).sum::<f32>() / right.len() as f32).sqrt();

                        // Calculate mixed RMS (theoretical)
                        let mixed: Vec<f32> = left.iter().zip(right.iter())
                            .map(|(l, r)| (l + r) / 2.0)
                            .collect();
                        let mixed_rms = (mixed.iter().map(|x| x * x).sum::<f32>() / mixed.len() as f32).sqrt();

                        // Calculate correlation coefficient to detect phase cancellation
                        let mean_left = left.iter().sum::<f32>() / left.len() as f32;
                        let mean_right = right.iter().sum::<f32>() / right.len() as f32;

                        let mut covariance = 0.0;
                        let mut var_left = 0.0;
                        let mut var_right = 0.0;

                        for (l, r) in left.iter().zip(right.iter()) {
                            let l_diff = l - mean_left;
                            let r_diff = r - mean_right;
                            covariance += l_diff * r_diff;
                            var_left += l_diff * l_diff;
                            var_right += r_diff * r_diff;
                        }

                        let correlation = if var_left > 0.0 && var_right > 0.0 {
                            covariance / (var_left.sqrt() * var_right.sqrt())
                        } else {
                            0.0
                        };

                        // Calculate signal loss percentage
                        let expected_rms = (left_rms + right_rms) / 2.0;
                        let signal_loss_pct = if expected_rms > 0.0 {
                            ((expected_rms - mixed_rms) / expected_rms * 100.0).max(0.0)
                        } else {
                            0.0
                        };

                        info!(
                            "🎧 Stereo Analysis [packet #{}]:\n  \
                             L-RMS: {:.6} | R-RMS: {:.6} | Mixed-RMS: {:.6}\n  \
                             Correlation: {:.3} | Signal Loss: {:.1}%\n  \
                             {}",
                            packet_num,
                            left_rms,
                            right_rms,
                            mixed_rms,
                            correlation,
                            signal_loss_pct,
                            if correlation < -0.5 {
                                "⚠️  WARNING: Negative correlation detected! Possible phase cancellation!"
                            } else if signal_loss_pct > 30.0 {
                                "⚠️  WARNING: High signal loss detected!"
                            } else if correlation > 0.9 {
                                "✅ Channels highly correlated (good)"
                            } else {
                                "ℹ️  Normal stereo signal"
                            }
                        );
                    }

                    data.chunks(2)
                        .map(|chunk| (chunk[0] + chunk.get(1).unwrap_or(&0.0)) / 2.0)
                        .collect()
                } else {
                    // Mono audio - add diagnostic output
                    if packet_num % 100 == 0 && !data.is_empty() {
                        let mono_rms = (data.iter().map(|x| x * x).sum::<f32>() / data.len() as f32).sqrt();
                        let peak = data.iter().map(|x| x.abs()).fold(0.0f32, f32::max);

                        info!(
                            "🎤 Mono Audio Analysis [packet #{}]:\n  \
                             RMS: {:.6} | Peak: {:.6}\n  \
                             {}",
                            packet_num,
                            mono_rms,
                            peak,
                            if mono_rms < 0.001 {
                                "⚠️  WARNING: Signal too weak! Speak louder or increase mic volume"
                            } else if peak > 0.95 {
                                "⚠️  WARNING: Signal clipping detected! Reduce mic volume"
                            } else if mono_rms < 0.01 {
                                "⚡ Low signal level (speak louder)"
                            } else if mono_rms > 0.3 {
                                "✅ Strong signal level (good)"
                            } else {
                                "✅ Normal signal level"
                            }
                        );
                    }
                    data.to_vec()
                };

                if let Err(e) = tx.try_send(mono_data) {
                    error!("Failed to send audio packet: {}", e);
                }
            },
            move |err| {
                error!("Audio stream error: {}", err);
            },
            None,
        )?;

        stream.play()?;
        self.stream = Some(stream);

        info!("Audio stream started successfully");
        Ok(())
    }

    /// Stop the audio stream
    pub fn stop_stream(&mut self) -> Result<()> {
        if let Some(stream) = self.stream.take() {
            drop(stream);
            info!("Audio stream stopped");
        }
        Ok(())
    }

    /// Get current sample rate
    pub fn sample_rate(&self) -> Option<u32> {
        self.config.as_ref().map(|c| c.sample_rate.into())
    }
}

impl Default for AudioCapture {
    fn default() -> Self {
        Self::new().expect("Failed to create AudioCapture")
    }
}

impl Drop for AudioCapture {
    fn drop(&mut self) {
        let _ = self.stop_stream();
    }
}
