use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::{
    connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream,
};
use tracing::{debug, error, info, warn};

use super::protocol::{ClientMessage, ServerMessage};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Active,
    Reconnecting,
}

pub struct WebSocketClient {
    url: String,
    api_key: String,
    state: ConnectionState,
    reconnect_attempts: usize,
    max_reconnect_attempts: usize,
}

impl WebSocketClient {
    /// Create a new WebSocket client
    ///
    /// # Arguments
    /// * `api_key` - ElevenLabs API key
    pub fn new(api_key: String) -> Self {
        let url = "wss://api.elevenlabs.io/v1/convai/conversation".to_string();
        Self {
            url,
            api_key,
            state: ConnectionState::Disconnected,
            reconnect_attempts: 0,
            max_reconnect_attempts: 3,
        }
    }

    /// Connect to the WebSocket server
    ///
    /// # Returns
    /// A tuple of (write_sink, read_stream) for sending and receiving messages
    pub async fn connect(
        &mut self,
    ) -> Result<(
        futures_util::stream::SplitSink<
            WebSocketStream<MaybeTlsStream<TcpStream>>,
            Message,
        >,
        futures_util::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    )> {
        self.state = ConnectionState::Connecting;

        let url = format!("{}?model_id=scribe_v2&encoding=pcm_16000", self.url);

        info!("Connecting to WebSocket: {}", url);

        let request = url.parse::<http::Uri>()?;

        // Create request with authorization header
        let (ws_stream, response) = connect_async(request).await.map_err(|e| {
            error!("WebSocket connection failed: {}", e);
            self.state = ConnectionState::Disconnected;
            anyhow!("Failed to connect: {}", e)
        })?;

        info!("WebSocket connected with response: {:?}", response.status());

        self.state = ConnectionState::Connected;
        self.reconnect_attempts = 0;

        let (write, read) = ws_stream.split();
        Ok((write, read))
    }

    /// Send audio data through WebSocket
    pub async fn send_audio(
        sink: &mut futures_util::stream::SplitSink<
            WebSocketStream<MaybeTlsStream<TcpStream>>,
            Message,
        >,
        audio_data: &[f32],
    ) -> Result<()> {
        let msg = ClientMessage::audio_chunk(audio_data);
        let json = serde_json::to_string(&msg)?;

        sink.send(Message::Text(json)).await.map_err(|e| {
            error!("Failed to send audio: {}", e);
            anyhow!("Send error: {}", e)
        })?;

        Ok(())
    }

    /// Start receiving messages from WebSocket
    pub async fn receive_loop(
        mut stream: futures_util::stream::SplitStream<
            WebSocketStream<MaybeTlsStream<TcpStream>>,
        >,
        tx: mpsc::Sender<ServerMessage>,
    ) -> Result<()> {
        info!("Starting WebSocket receive loop");

        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    debug!("Received message: {}", text);

                    match serde_json::from_str::<ServerMessage>(&text) {
                        Ok(server_msg) => {
                            if let Err(e) = tx.send(server_msg).await {
                                error!("Failed to send message to channel: {}", e);
                                break;
                            }
                        }
                        Err(e) => {
                            warn!("Failed to parse server message: {} - {}", e, text);
                        }
                    }
                }
                Ok(Message::Close(frame)) => {
                    info!("WebSocket closed: {:?}", frame);
                    break;
                }
                Ok(Message::Ping(data)) => {
                    debug!("Received ping, sending pong");
                    // Pong is handled automatically by tokio-tungstenite
                }
                Ok(Message::Pong(_)) => {
                    debug!("Received pong");
                }
                Err(e) => {
                    error!("WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }

        info!("WebSocket receive loop ended");
        Ok(())
    }

    /// Reconnect with exponential backoff
    pub async fn reconnect_with_backoff(&mut self) -> Result<(
        futures_util::stream::SplitSink<
            WebSocketStream<MaybeTlsStream<TcpStream>>,
            Message,
        >,
        futures_util::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    )> {
        self.state = ConnectionState::Reconnecting;

        while self.reconnect_attempts < self.max_reconnect_attempts {
            self.reconnect_attempts += 1;

            let backoff_ms = 1000 * 2_u64.pow(self.reconnect_attempts as u32 - 1);
            warn!(
                "Reconnecting... (attempt {}/{}, waiting {}ms)",
                self.reconnect_attempts, self.max_reconnect_attempts, backoff_ms
            );

            sleep(Duration::from_millis(backoff_ms)).await;

            match self.connect().await {
                Ok(streams) => {
                    info!("Reconnected successfully");
                    return Ok(streams);
                }
                Err(e) => {
                    error!("Reconnection failed: {}", e);
                }
            }
        }

        self.state = ConnectionState::Disconnected;
        Err(anyhow!(
            "Failed to reconnect after {} attempts",
            self.max_reconnect_attempts
        ))
    }

    /// Get current connection state
    pub fn state(&self) -> &ConnectionState {
        &self.state
    }

    /// Set connection state
    pub fn set_state(&mut self, state: ConnectionState) {
        self.state = state;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = WebSocketClient::new("test_api_key".to_string());
        assert_eq!(client.state(), &ConnectionState::Disconnected);
    }
}
