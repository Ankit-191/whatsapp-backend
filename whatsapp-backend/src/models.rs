use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id: Uuid,
    pub whatsapp_number: String,
    pub name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub status: String,
    pub last_message_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
 
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub provider_message_id: Option<String>,
    pub direction: String, // "inbound" | "outbound"
    pub sender_type: String, // "customer" | "bot" | "agent"
    pub body: String,
    pub status: String, // "sent" | "delivered" | "read" | "received" | "failed"
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ConversationWithCustomer {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub customer_number: String,
    pub customer_name: Option<String>,
    pub status: String,
    pub last_message_at: DateTime<Utc>,
    pub last_message: Option<String>,
    pub unread_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct SendMessagePayload {
    pub body: String,
}

// Meta Webhook models
#[derive(Debug, Deserialize)]
pub struct WebhookQuery {
    #[serde(rename = "hub.mode")]
    pub mode: Option<String>,
    #[serde(rename = "hub.verify_token")]
    pub verify_token: Option<String>,
    #[serde(rename = "hub.challenge")]
    pub challenge: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaWebhookPayload {
    pub object: Option<String>,
    pub entry: Option<Vec<MetaEntry>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaEntry {
    pub id: Option<String>,
    pub changes: Option<Vec<MetaChange>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaChange {
    pub field: Option<String>,
    pub value: Option<MetaValue>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaValue {
    pub messaging_product: Option<String>,
    pub metadata: Option<MetaMetadata>,
    pub contacts: Option<Vec<MetaContact>>,
    pub messages: Option<Vec<MetaIncomingMessage>>,
    pub statuses: Option<Vec<MetaMessageStatus>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaMetadata {
    pub display_phone_number: Option<String>,
    pub phone_number_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaContact {
    pub profile: Option<MetaProfile>,
    pub wa_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaProfile {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaIncomingMessage {
    pub from: String,
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub message_type: Option<String>,
    pub text: Option<MetaText>,
    pub interactive: Option<MetaIncomingInteractive>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaIncomingInteractive {
    #[serde(rename = "type")]
    pub interactive_type: Option<String>,
    pub button_reply: Option<MetaButtonReply>,
    pub list_reply: Option<MetaListReply>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaButtonReply {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaListReply {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaText {
    pub body: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MetaMessageStatus {
    pub id: String,
    pub status: String, // sent, delivered, read, failed
    pub timestamp: String,
    pub recipient_id: String,
}

// WebSocket broadcast event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsEvent {
    NewMessage(Message),
    MessageStatusUpdated {
        id: Uuid,
        provider_message_id: Option<String>,
        status: String,
    },
    ConversationUpdated(ConversationWithCustomer),
}
