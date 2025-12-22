use super::*;

#[cfg(test)]
mod protocol_tests {
    use super::*;
    use crate::network::protocol::{ClientMessage, ServerMessage};

    #[test]
    fn test_client_message_serialization() {
        let msg = ClientMessage::AudioChunk {
            audio_base_64: "SGVsbG8gV29ybGQ=".to_string(),
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("input_audio_chunk"));
        assert!(json.contains("audio_base_64"));
        assert!(json.contains("SGVsbG8gV29ybGQ="));
    }

    #[test]
    fn test_server_message_deserialization_session_started() {
        let json = r#"{"message_type":"session_started","session_id":"test-123"}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        match msg {
            ServerMessage::SessionStarted { session_id } => {
                assert_eq!(session_id, "test-123");
            }
            _ => panic!("Expected SessionStarted message"),
        }
    }

    #[test]
    fn test_server_message_deserialization_partial_transcript() {
        let json = r#"{"message_type":"partial_transcript","text":"Hello","created_at_ms":1234567890}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        match msg {
            ServerMessage::PartialTranscript {
                text,
                created_at_ms,
            } => {
                assert_eq!(text, "Hello");
                assert_eq!(created_at_ms, 1234567890);
            }
            _ => panic!("Expected PartialTranscript message"),
        }
    }

    #[test]
    fn test_server_message_deserialization_committed_transcript() {
        let json = r#"{"message_type":"committed_transcript","text":"Hello World","confidence":0.95}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        match msg {
            ServerMessage::CommittedTranscript { text, confidence } => {
                assert_eq!(text, "Hello World");
                assert_eq!(confidence, 0.95);
            }
            _ => panic!("Expected CommittedTranscript message"),
        }
    }

    #[test]
    fn test_server_message_deserialization_error() {
        let json = r#"{"message_type":"input_error","error_message":"API key invalid"}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        match msg {
            ServerMessage::InputError { error_message } => {
                assert_eq!(error_message, "API key invalid");
            }
            _ => panic!("Expected InputError message"),
        }
    }

    #[test]
    fn test_invalid_message_deserialization() {
        let json = r#"{"message_type":"unknown"}"#;
        let result: Result<ServerMessage, _> = serde_json::from_str(json);
        assert!(result.is_err(), "Should fail to deserialize unknown message type");
    }
}

#[cfg(test)]
mod batch_tests {
    use super::*;
    use crate::network::batch::MessageBatcher;
    use crate::network::protocol::ClientMessage;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_batcher_size_trigger() {
        let mut batcher = MessageBatcher::new(3, Duration::from_secs(10));

        // Add 3 messages (should trigger flush)
        for i in 0..3 {
            let msg = ClientMessage::AudioChunk {
                audio_base_64: format!("data{}", i),
            };
            batcher.add_message(msg).await;
        }

        let messages = batcher.flush().await;
        assert_eq!(messages.len(), 3);
    }

    #[tokio::test]
    async fn test_batcher_time_trigger() {
        let mut batcher = MessageBatcher::new(100, Duration::from_millis(50));

        // Add 1 message
        let msg = ClientMessage::AudioChunk {
            audio_base_64: "data".to_string(),
        };
        batcher.add_message(msg).await;

        // Wait for time trigger
        sleep(Duration::from_millis(60)).await;

        let messages = batcher.flush().await;
        assert_eq!(messages.len(), 1);
    }

    #[tokio::test]
    async fn test_batcher_empty_flush() {
        let mut batcher = MessageBatcher::new(10, Duration::from_secs(1));
        let messages = batcher.flush().await;
        assert_eq!(messages.len(), 0);
    }

    #[tokio::test]
    async fn test_batcher_multiple_flushes() {
        let mut batcher = MessageBatcher::new(2, Duration::from_secs(10));

        // First batch
        for i in 0..2 {
            let msg = ClientMessage::AudioChunk {
                audio_base_64: format!("batch1_{}", i),
            };
            batcher.add_message(msg).await;
        }

        let messages1 = batcher.flush().await;
        assert_eq!(messages1.len(), 2);

        // Second batch
        for i in 0..2 {
            let msg = ClientMessage::AudioChunk {
                audio_base_64: format!("batch2_{}", i),
            };
            batcher.add_message(msg).await;
        }

        let messages2 = batcher.flush().await;
        assert_eq!(messages2.len(), 2);
    }
}

#[cfg(test)]
mod connection_tests {
    use super::*;
    use crate::network::websocket::ConnectionState;

    #[test]
    fn test_connection_state_transitions() {
        let state = ConnectionState::Disconnected;
        assert!(matches!(state, ConnectionState::Disconnected));

        let state = ConnectionState::Connecting;
        assert!(matches!(state, ConnectionState::Connecting));

        let state = ConnectionState::Connected;
        assert!(matches!(state, ConnectionState::Connected));

        let state = ConnectionState::Active;
        assert!(matches!(state, ConnectionState::Active));

        let state = ConnectionState::Error("test error".to_string());
        match state {
            ConnectionState::Error(msg) => assert_eq!(msg, "test error"),
            _ => panic!("Expected Error state"),
        }
    }
}
