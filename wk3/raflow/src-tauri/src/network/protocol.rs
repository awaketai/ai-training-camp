use base64::Engine;
use serde::{Deserialize, Serialize};

/// Messages sent from client to ElevenLabs Scribe API
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "message_type")]
pub enum ClientMessage {
    /// Audio chunk with PCM data encoded in base64
    #[serde(rename = "input_audio_chunk")]
    AudioChunk {
        audio_base_64: String,
        sample_rate: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        commit: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        previous_text: Option<String>,
    },
}

/// Messages received from ElevenLabs Scribe API
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "message_type")]
pub enum ServerMessage {
    /// Session has been started successfully
    #[serde(rename = "session_started")]
    SessionStarted {
        session_id: String,
        #[serde(default)]
        model_id: String,
    },

    /// Partial (interim) transcription result
    #[serde(rename = "partial_transcript")]
    PartialTranscript {
        text: String,
        #[serde(default)]
        created_at_ms: u64,
        #[serde(default)]
        normalized_text: String,
    },

    /// Final (committed) transcription result
    #[serde(rename = "committed_transcript")]
    CommittedTranscript {
        text: String,
        #[serde(default)]
        normalized_text: String,
        #[serde(default)]
        confidence: f32,
    },

    /// Committed transcript with word-level timestamps
    #[serde(rename = "committed_transcript_with_timestamps")]
    CommittedTranscriptWithTimestamps {
        text: String,
        #[serde(default)]
        normalized_text: String,
        #[serde(default)]
        confidence: f32,
        #[serde(default)]
        words: Vec<serde_json::Value>,
        #[serde(default)]
        language_code: String,
    },

    /// Input validation or processing error
    #[serde(rename = "input_error")]
    InputError {
        error_message: String,
        #[serde(default)]
        error_code: String,
    },

    /// Invalid request error
    #[serde(rename = "invalid_request")]
    InvalidRequest {
        error: String,
    },

    /// Session configuration message
    #[serde(rename = "session_config")]
    SessionConfig {
        #[serde(default)]
        model_id: String,
        #[serde(default)]
        encoding: String,
    },
}

impl ClientMessage {
    /// Create an audio chunk message from PCM samples
    pub fn audio_chunk(samples: &[f32]) -> Self {
        Self::audio_chunk_with_commit(samples, false)
    }

    /// Create an audio chunk message with optional commit flag
    pub fn audio_chunk_with_commit(samples: &[f32], commit: bool) -> Self {
        // Convert f32 samples to i16 PCM
        let pcm_i16: Vec<i16> = samples
            .iter()
            .map(|&x| (x.clamp(-1.0, 1.0) * 32767.0) as i16)
            .collect();

        // Convert to bytes
        let bytes: Vec<u8> = pcm_i16
            .iter()
            .flat_map(|&sample| sample.to_le_bytes())
            .collect();

        // Encode as base64
        let audio_base_64 = base64::engine::general_purpose::STANDARD.encode(&bytes);

        ClientMessage::AudioChunk {
            audio_base_64,
            sample_rate: 16000, // Scribe v2 Realtime requires sample_rate
            commit: if commit { Some(true) } else { None },
            previous_text: None,
        }
    }
}

impl ServerMessage {
    /// Check if this is a final transcript
    pub fn is_final(&self) -> bool {
        matches!(
            self,
            ServerMessage::CommittedTranscript { .. }
                | ServerMessage::CommittedTranscriptWithTimestamps { .. }
        )
    }

    /// Get the transcript text if available
    pub fn text(&self) -> Option<&str> {
        match self {
            ServerMessage::PartialTranscript { text, .. } => Some(text),
            ServerMessage::CommittedTranscript { text, .. } => Some(text),
            ServerMessage::CommittedTranscriptWithTimestamps { text, .. } => Some(text),
            _ => None,
        }
    }

    /// Check if this is an error message
    pub fn is_error(&self) -> bool {
        matches!(
            self,
            ServerMessage::InputError { .. } | ServerMessage::InvalidRequest { .. }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_message_serialization() {
        let samples = vec![0.0, 0.1, -0.1];
        let msg = ClientMessage::audio_chunk(&samples);

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("input_audio_chunk"));
        assert!(json.contains("audio_base_64"));
    }

    #[test]
    fn test_server_message_deserialization() {
        let json = r#"{"message_type":"partial_transcript","text":"Hello","created_at_ms":1234567890,"normalized_text":"hello"}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        assert!(!msg.is_final());
        assert_eq!(msg.text(), Some("Hello"));
    }

    #[test]
    fn test_committed_transcript() {
        let json = r#"{"message_type":"committed_transcript","text":"Hello world","normalized_text":"hello world","confidence":0.95}"#;
        let msg: ServerMessage = serde_json::from_str(json).unwrap();

        assert!(msg.is_final());
        assert_eq!(msg.text(), Some("Hello world"));
    }
}
