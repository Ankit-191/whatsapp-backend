use crate::{
    db,
    models::{SendMessagePayload, WsEvent},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::{error, info};
use uuid::Uuid;

/// GET /api/conversations
pub async fn list_conversations(State(state): State<SharedState>) -> impl IntoResponse {
    match db::list_conversations(&state.pool).await {
        Ok(conversations) => (StatusCode::OK, Json(json!({ "conversations": conversations }))).into_response(),
        Err(err) => {
            error!("Failed to fetch conversations: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to fetch conversations" })),
            )
                .into_response()
        }
    }
}

/// GET /api/conversations/:id/messages
pub async fn get_messages(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match db::get_conversation_messages(&state.pool, id).await {
        Ok(messages) => (StatusCode::OK, Json(json!({ "messages": messages }))).into_response(),
        Err(err) => {
            error!("Failed to fetch messages for conversation {}: {}", id, err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to fetch messages" })),
            )
                .into_response()
        }
    }
}

/// POST /api/conversations/:id/messages
pub async fn send_reply(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SendMessagePayload>,
) -> impl IntoResponse {
    let text = payload.body.trim();
    if text.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Message body cannot be empty" })),
        )
            .into_response();
    }

    // 1. Fetch conversation details to know customer phone number
    let conversation = match db::get_conversation_by_id(&state.pool, id).await {
        Ok(Some(conv)) => conv,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Conversation not found" })),
            )
                .into_response()
        }
        Err(e) => {
            error!("Failed to fetch conversation: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Database error" })),
            )
                .into_response();
        }
    };

    info!(
        conversation_id = %id,
        recipient = %conversation.customer_number,
        body = %text,
        "Employee sending manual reply to customer"
    );

    // 2. Send message via Meta WhatsApp Cloud API
    let provider_id = match state
        .meta_client
        .send_text_message(&conversation.customer_number, text)
        .await
    {
        Ok(pid) => Some(pid),
        Err(err) => {
            error!("Failed to send reply via Meta WhatsApp API: {}", err);
            None
        }
    };

    // 3. Save agent message to DB
    let status = if provider_id.is_some() { "sent" } else { "failed" };
    match db::insert_message(
        &state.pool,
        id,
        provider_id.as_deref(),
        "outbound",
        "agent",
        text,
        status,
    )
    .await
    {
        Ok(msg) => {
            let _ = state.ws_tx.send(WsEvent::NewMessage(msg.clone()));

            if let Ok(Some(updated_conv)) = db::get_conversation_by_id(&state.pool, id).await {
                let _ = state.ws_tx.send(WsEvent::ConversationUpdated(updated_conv));
            }

            (StatusCode::CREATED, Json(json!({ "message": msg }))).into_response()
        }
        Err(err) => {
            error!("Failed to save sent message to database: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to save message to database" })),
            )
                .into_response()
        }
    }
}

/// GET /api/knowledge
pub async fn get_knowledge(State(state): State<SharedState>) -> impl IntoResponse {
    let summary = state.faq_engine.get_knowledge_summary();
    Json(json!({
        "knowledge": summary,
        "fallback_message": state.faq_engine.fallback_reply
    }))
}

