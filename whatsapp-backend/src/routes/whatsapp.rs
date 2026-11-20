use crate::{
    db,
    models::{MetaWebhookPayload, WebhookQuery, WsEvent},
    state::SharedState,
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use tracing::{error, info, warn};

/// GET /webhooks/whatsapp - Verification challenge from Meta Developer Portal
pub async fn verify_webhook(
    State(state): State<SharedState>,
    Query(query): Query<WebhookQuery>,
) -> Result<String, (StatusCode, String)> {
    info!(
        mode = ?query.mode,
        token = ?query.verify_token,
        challenge = ?query.challenge,
        "Received Meta webhook verification handshake"
    );

    if let (Some(mode), Some(token), Some(challenge)) = (
        query.mode.as_deref(),
        query.verify_token.as_deref(),
        query.challenge,
    ) {
        if mode == "subscribe" && token == state.config.meta_verify_token {
            info!("Meta webhook handshake verified successfully!");
            return Ok(challenge);
        }
    }

    warn!("Webhook verification failed: token mismatch or invalid mode.");
    Err((StatusCode::FORBIDDEN, "Verification failed".to_string()))
}

/// POST /webhooks/whatsapp - Receives incoming messages and status callbacks from Meta
pub async fn receive_webhook(
    State(state): State<SharedState>,
    Json(payload): Json<MetaWebhookPayload>,
) -> impl IntoResponse {
    let entries = match payload.entry {
        Some(e) => e,
        None => return StatusCode::OK,
    };

    for entry in entries {
        let changes = match entry.changes {
            Some(c) => c,
            None => continue,
        };

        for change in changes {
            let value = match change.value {
                Some(v) => v,
                None => continue,
            };

            // 1. Process message status updates (e.g. sent, delivered, read)
            if let Some(statuses) = value.statuses {
                for st in statuses {
                    info!(
                        provider_id = %st.id,
                        status = %st.status,
                        recipient = %st.recipient_id,
                        "Received message status update from Meta"
                    );

                    match db::update_message_status(&state.pool, &st.id, &st.status).await {
                        Ok(Some(updated_msg)) => {
                            let _ = state.ws_tx.send(WsEvent::MessageStatusUpdated {
                                id: updated_msg.id,
                                provider_message_id: updated_msg.provider_message_id,
                                status: updated_msg.status,
                            });
                        }
                        Ok(None) => {}
                        Err(err) => {
                            error!("Error updating message status in DB: {}", err);
                        }
                    }
                }
            }

            // 2. Process incoming messages (Text or Button replies)
            if let Some(messages) = value.messages {
                for incoming in messages {
                    let from_number = incoming.from;
                    let provider_msg_id = incoming.id;

                    // Extract text body from normal text OR interactive button click
                    let (text_body, query_trigger) = if let Some(ref inter) = incoming.interactive {
                        if let Some(ref btn) = inter.button_reply {
                            (btn.title.clone(), btn.id.clone())
                        } else if let Some(ref list) = inter.list_reply {
                            (list.title.clone(), list.id.clone())
                        } else {
                            let b = incoming.text.as_ref().map(|t| t.body.clone()).unwrap_or_else(|| "[Interactive Message]".to_string());
                            (b.clone(), b)
                        }
                    } else if let Some(ref text) = incoming.text {
                        (text.body.clone(), text.body.clone())
                    } else {
                        ("[Media/Attachment received]".to_string(), "".to_string())
                    };

                    // Check for contact profile name
                    let contact_name = value
                        .contacts
                        .as_ref()
                        .and_then(|contacts| contacts.first())
                        .and_then(|c| c.profile.as_ref())
                        .and_then(|p| p.name.clone());

                    info!(
                        from = %from_number,
                        name = ?contact_name,
                        text = %text_body,
                        query = %query_trigger,
                        "Processing inbound WhatsApp message"
                    );

                    // Step A: Customer record
                    let customer = match db::get_or_create_customer(
                        &state.pool,
                        &from_number,
                        contact_name.as_deref(),
                    )
                    .await
                    {
                        Ok(c) => c,
                        Err(e) => {
                            error!("Failed to get or create customer: {}", e);
                            continue;
                        }
                    };

                    // Step B: Conversation record
                    let conversation = match db::get_or_create_conversation(&state.pool, customer.id).await {
                        Ok(conv) => conv,
                        Err(e) => {
                            error!("Failed to get or create conversation: {}", e);
                            continue;
                        }
                    };

                    // Step C: Save inbound message
                    let saved_msg = match db::insert_message(
                        &state.pool,
                        conversation.id,
                        Some(&provider_msg_id),
                        "inbound",
                        "customer",
                        &text_body,
                        "received",
                    )
                    .await
                    {
                        Ok(m) => m,
                        Err(e) => {
                            error!("Failed to insert inbound message: {}", e);
                            continue;
                        }
                    };

                    // Notify WebSocket clients
                    let _ = state.ws_tx.send(WsEvent::NewMessage(saved_msg));

                    if let Ok(Some(conv_summary)) = db::get_conversation_by_id(&state.pool, conversation.id).await {
                        let _ = state.ws_tx.send(WsEvent::ConversationUpdated(conv_summary));
                    }

                    // Step D: Answer query via FAQ Engine
                    let bot_reply = state.faq_engine.answer_query(if !query_trigger.is_empty() {
                        &query_trigger
                    } else {
                        &text_body
                    });

                    info!(
                        reply = %bot_reply.text,
                        is_interactive = %bot_reply.is_interactive_menu,
                        "Prepared bot reply"
                    );

                    // Step E: Send bot reply via Meta WhatsApp Cloud API (Interactive buttons or text)
                    let outbound_provider_id = if bot_reply.is_interactive_menu && !bot_reply.buttons.is_empty() {
                        match state
                            .meta_client
                            .send_interactive_buttons(
                                &from_number,
                                bot_reply.header.as_deref(),
                                &bot_reply.text,
                                &bot_reply.buttons,
                            )
                            .await
                        {
                            Ok(pid) => Some(pid),
                            Err(err) => {
                                error!("Failed to send interactive buttons via Meta API: {}", err);
                                None
                            }
                        }
                    } else {
                        match state
                            .meta_client
                            .send_text_message(&from_number, &bot_reply.text)
                            .await
                        {
                            Ok(pid) => Some(pid),
                            Err(err) => {
                                error!("Failed to send WhatsApp message via Meta API: {}", err);
                                None
                            }
                        }
                    };

                    // Step F: Save bot reply in database
                    match db::insert_message(
                        &state.pool,
                        conversation.id,
                        outbound_provider_id.as_deref(),
                        "outbound",
                        "bot",
                        &bot_reply.text,
                        if outbound_provider_id.is_some() { "sent" } else { "failed" },
                    )
                    .await
                    {
                        Ok(bot_msg) => {
                            let _ = state.ws_tx.send(WsEvent::NewMessage(bot_msg));
                            if let Ok(Some(conv_summary)) = db::get_conversation_by_id(&state.pool, conversation.id).await {
                                let _ = state.ws_tx.send(WsEvent::ConversationUpdated(conv_summary));
                            }
                        }
                        Err(err) => {
                            error!("Failed to save bot response message: {}", err);
                        }
                    }
                }
            }
        }
    }

    StatusCode::OK
}
