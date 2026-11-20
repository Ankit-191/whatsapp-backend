use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use tracing::{error, info};

#[derive(Clone, Debug)]
pub struct MetaClient {
    client: Client,
    access_token: String,
    phone_number_id: String,
    graph_api_version: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageResponse {
    pub messages: Option<Vec<MetaResponseMessage>>,
}

#[derive(Debug, Deserialize)]
pub struct MetaResponseMessage {
    pub id: String,
}

impl MetaClient {
    pub fn new(access_token: String, phone_number_id: String, graph_api_version: String) -> Self {
        Self {
            client: Client::new(),
            access_token,
            phone_number_id,
            graph_api_version,
        }
    }

    /// Sends a standard text message to a WhatsApp number.
    pub async fn send_text_message(&self, recipient_phone: &str, text: &str) -> Result<String, String> {
        if self.access_token.is_empty() || self.phone_number_id.is_empty() {
            let mock_id = format!("wamid.mock_{}", uuid::Uuid::new_v4());
            info!(
                recipient = recipient_phone,
                message = text,
                mock_id = %mock_id,
                "Meta credentials not set or in test mode. Simulated WhatsApp message send."
            );
            return Ok(mock_id);
        }

        let url = format!(
            "https://graph.facebook.com/{}/{}/messages",
            self.graph_api_version, self.phone_number_id
        );

        let payload = json!({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "text",
            "text": {
                "preview_url": false,
                "body": text
            }
        });

        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.access_token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Failed to send request to Meta API: {}", e))?;

        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());

        if !status.is_success() {
            error!(status = %status, body = %body_text, "Meta API returned error response");
            return Err(format!("Meta API error (status {}): {}", status, body_text));
        }

        let parsed: SendMessageResponse = serde_json::from_str(&body_text)
            .map_err(|e| format!("Failed to parse Meta response JSON: {} (body: {})", e, body_text))?;

        if let Some(messages) = parsed.messages {
            if let Some(first) = messages.into_iter().next() {
                return Ok(first.id);
            }
        }

        Ok(format!("wamid.sent_{}", uuid::Uuid::new_v4()))
    }

    /// Sends an interactive message with up to 3 quick-reply buttons (HDFC style)
    pub async fn send_interactive_buttons(
        &self,
        recipient_phone: &str,
        header_text: Option<&str>,
        body_text: &str,
        buttons: &[(String, String)], // (id, title)
    ) -> Result<String, String> {
        if self.access_token.is_empty() || self.phone_number_id.is_empty() {
            let mock_id = format!("wamid.mock_interactive_{}", uuid::Uuid::new_v4());
            info!(
                recipient = recipient_phone,
                body = body_text,
                buttons = ?buttons,
                mock_id = %mock_id,
                "Meta credentials not set or in test mode. Simulated WhatsApp interactive buttons send."
            );
            return Ok(mock_id);
        }

        let url = format!(
            "https://graph.facebook.com/{}/{}/messages",
            self.graph_api_version, self.phone_number_id
        );

        let action_buttons: Vec<serde_json::Value> = buttons
            .iter()
            .take(3)
            .map(|(id, title)| {
                json!({
                    "type": "reply",
                    "reply": {
                        "id": id,
                        "title": if title.chars().count() > 20 {
                            title.chars().take(20).collect::<String>()
                        } else {
                            title.clone()
                        }
                    }
                })
            })
            .collect();

        let mut interactive_payload = json!({
            "type": "button",
            "body": {
                "text": body_text
            },
            "action": {
                "buttons": action_buttons
            }
        });

        if let Some(header) = header_text {
            interactive_payload["header"] = json!({
                "type": "text",
                "text": header
            });
        }

        let payload = json!({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "interactive",
            "interactive": interactive_payload
        });

        let resp = self
            .client
            .post(&url)
            .bearer_auth(&self.access_token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Failed to send interactive buttons to Meta API: {}", e))?;

        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());

        if !status.is_success() {
            error!(status = %status, body = %body_text, "Meta API returned error response for interactive message");
            return Err(format!("Meta API error (status {}): {}", status, body_text));
        }

        let parsed: SendMessageResponse = serde_json::from_str(&body_text)
            .map_err(|e| format!("Failed to parse Meta response JSON: {} (body: {})", e, body_text))?;

        if let Some(messages) = parsed.messages {
            if let Some(first) = messages.into_iter().next() {
                return Ok(first.id);
            }
        }

        Ok(format!("wamid.sent_{}", uuid::Uuid::new_v4()))
    }
}
