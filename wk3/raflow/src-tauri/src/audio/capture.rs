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

        let stream = device.build_input_stream(
            config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                // Convert to mono if stereo by averaging channels
                let mono_data: Vec<f32> = if channels == 2 {
                    data.chunks(2)
                        .map(|chunk| (chunk[0] + chunk.get(1).unwrap_or(&0.0)) / 2.0)
                        .collect()
                } else {
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
