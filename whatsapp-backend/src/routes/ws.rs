use crate::state::SharedState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use tracing::{debug, error, info};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: SharedState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.ws_tx.subscribe();

    info!("New WebSocket client connected to live support feed.");

    // Send initial ping or welcome
    let welcome = serde_json::json!({
        "type": "Connected",
        "data": { "message": "Connected to WhatsApp live support stream" }
    });
    if let Ok(text) = serde_json::to_string(&welcome) {
        let _ = sender.send(Message::Text(text.into())).await;
    }

    // Task to forward broadcast events to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            match serde_json::to_string(&event) {
                Ok(json_str) => {
                    if sender.send(Message::Text(json_str.into())).await.is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("Failed to serialize WsEvent: {}", e);
                }
            }
        }
    });

    // Task to read incoming messages / pings from client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Close(_) => break,
                Message::Ping(_) => {
                    debug!("Received ping from client");
                }
                _ => {}
            }
        }
    });

    // If any task ends, abort the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    info!("WebSocket client disconnected.");
}
