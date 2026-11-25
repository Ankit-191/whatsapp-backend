use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::Value;

/// Proxy GET /api/bridge/status to the internal WhatsApp Bridge (port 3001)
pub async fn get_bridge_status() -> impl IntoResponse {
    let client = reqwest::Client::new();
    match client
        .get("http://127.0.0.1:3001/api/status")
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(json) = resp.json::<Value>().await {
                (StatusCode::OK, Json(json)).into_response()
            } else {
                (
                    StatusCode::OK,
                    Json(serde_json::json!({
                        "status": "initializing",
                        "connectedUser": null,
                        "qr": null
                    })),
                )
                    .into_response()
            }
        }
        Err(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "status": "initializing",
                "connectedUser": null,
                "qr": null
            })),
        )
            .into_response(),
    }
}

/// Proxy POST /api/bridge/send to the internal WhatsApp Bridge (port 3001)
pub async fn bridge_send(Json(payload): Json<Value>) -> impl IntoResponse {
    let client = reqwest::Client::new();
    match client
        .post("http://127.0.0.1:3001/api/send")
        .json(&payload)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let json = resp
                .json::<Value>()
                .await
                .unwrap_or_else(|_| serde_json::json!({"error": "Failed to parse bridge response"}));
            (
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
                Json(json),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "error": format!("Bridge unavailable: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Proxy GET /api/bridge/logs to internal WhatsApp Bridge (port 3001)
pub async fn get_bridge_logs() -> impl IntoResponse {
    let client = reqwest::Client::new();
    match client
        .get("http://127.0.0.1:3001/api/logs")
        .timeout(std::time::Duration::from_secs(4))
        .send()
        .await
    {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_default();
            (StatusCode::OK, [("content-type", "text/plain")], text).into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            [("content-type", "text/plain")],
            format!("Failed to reach bridge logs: {}", e),
        )
            .into_response(),
    }
}

