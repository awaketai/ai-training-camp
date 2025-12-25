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

// Initialize rustls crypto provider
fn init_crypto_provider() {
    use std::sync::Once;
    static INIT: Once = Once::new();

    INIT.call_once(|| {
        let provider = rustls::crypto::aws_lc_rs::default_provider();
        let _ = provider.install_default();
    });
}

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
        // Scribe v2 Realtime API endpoint for speech-to-text
        let url = "wss://api.elevenlabs.io/v1/speech-to-text/realtime".to_string();
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
        // Initialize crypto provider (idempotent)
        init_crypto_provider();

        self.state = ConnectionState::Connecting;

        // Scribe v2 Realtime is the only supported model for WebSocket
        // Supported Chinese language codes from API: zho, yue, nan
        // zho = Mandarin Chinese (Standard Chinese)
        // yue = Cantonese
        // nan = Min Nan (Hokkien/Taiwanese)
        let url = format!("{}?model_id=scribe_v2_realtime&language_code=zho", self.url);

        info!("Connecting to Scribe v2 Realtime WebSocket with Mandarin Chinese (zho): {}", url);

        // Create request with authorization header
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        use tokio_tungstenite::tungstenite::http::HeaderValue;
        let mut request = url.into_client_request()?;

        // Add API key header
        let header_value = HeaderValue::from_str(&self.api_key)
            .map_err(|_| anyhow!("Invalid API key format"))?;

        request.headers_mut().insert("xi-api-key", header_value);

        info!("Connecting with API key authorization header");

        let (ws_stream, response) = connect_async(request).await.map_err(|e| {
            error!("WebSocket connection failed: {}", e);
            self.state = ConnectionState::Disconnected;
            anyhow!("Failed to connect: {}", e)
        })?;

        info!("WebSocket connected successfully");
        info!("Response status: {}", response.status());
        info!("Response headers: {:?}", response.headers());

        self.state = ConnectionState::Connected;
        self.reconnect_attempts = 0;

        let (write, read) = ws_stream.split();

        info!("WebSocket stream split completed, ready to send/receive");
        Ok((write, read))
    }

    /// Send audio data through WebSocket
    pub async fn send_audio(
        sink: &mut futures_util::stream::SplitSink<
            WebSocketStream<MaybeTlsStream<TcpStream>>,
            Message,
        >,
        audio_data: &[f32],
        commit: bool,
    ) -> Result<()> {
        let msg = ClientMessage::audio_chunk_with_commit(audio_data, commit);
        let json = serde_json::to_string(&msg)?;

        if commit {
            info!("Sending audio with COMMIT flag (speech segment ended)");
        }

        sink.send(Message::Text(json.into())).await.map_err(|e| {
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
                    debug!("Received text message: {}", text);

                    match serde_json::from_str::<ServerMessage>(&text) {
                        Ok(server_msg) => {
                            info!("Parsed server message: {:?}", server_msg);
                            if let Err(e) = tx.send(server_msg).await {
                                error!("Failed to send message to channel: {}", e);
                                break;
                            }
                        }
                        Err(e) => {
                            warn!("Failed to parse server message: {} - Raw text: {}", e, text);
                        }
                    }
                }
                Ok(Message::Close(frame)) => {
                    if let Some(cf) = frame {
                        error!("WebSocket closed by server - Code: {}, Reason: {}", cf.code, cf.reason);
                    } else {
                        info!("WebSocket closed by server (no close frame)");
                    }
                    break;
                }
                Ok(Message::Ping(_data)) => {
                    debug!("Received ping");
                    // Pong is handled automatically by tokio-tungstenite
                }
                Ok(Message::Pong(_)) => {
                    debug!("Received pong");
                }
                Ok(Message::Binary(data)) => {
                    warn!("Received unexpected binary message of {} bytes", data.len());
                }
                Ok(Message::Frame(_)) => {
                    debug!("Received raw frame");
                }
                Err(e) => {
                    error!("WebSocket receive error: {}", e);
                    break;
                }
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
