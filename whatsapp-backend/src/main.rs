mod config;
mod db;
mod faq;
mod meta;
mod models;
mod routes;
mod state;

use axum::{routing::get, Router};
use config::Config;
use state::{AppState, SharedState};
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize Logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 2. Load Configuration
    let config = Config::from_env();
    info!("Starting WhatsApp Support Backend on port {}", config.port);

    // 3. Connect to Database & Run Initial Schema
    let pool = match db::init_db(&config.database_url).await {
        Ok(p) => {
            info!("Connected to PostgreSQL database successfully.");
            p
        }
        Err(e) => {
            tracing::error!(
                "Failed to connect to PostgreSQL at {}: {}. Ensure database is running.",
                config.database_url,
                e
            );
            return Err(e.into());
        }
    };

    // 4. Create Shared Application State
    let state: SharedState = Arc::new(AppState::new(pool, config.clone()));

    // 5. Setup CORS
    let cors = CorsLayer::very_permissive();

    // 6. Build App Routes
    let app = Router::new()
        // Health check
        .route("/health", get(routes::health::health_check))
        // Meta WhatsApp Webhook
        .route(
            "/webhooks/whatsapp",
            get(routes::whatsapp::verify_webhook).post(routes::whatsapp::receive_webhook),
        )
        // Inbox & Messages
        .route(
            "/api/conversations",
            get(routes::conversations::list_conversations),
        )
        .route(
            "/api/conversations/:id/messages",
            get(routes::conversations::get_messages).post(routes::conversations::send_reply),
        )
        // Knowledge / Bot Replies
        .route(
            "/api/knowledge",
            get(routes::conversations::get_knowledge),
        )
        // WhatsApp QR Bridge Proxy
        .route("/api/bridge/status", get(routes::bridge::get_bridge_status))
        .route("/api/bridge/send", axum::routing::post(routes::bridge::bridge_send))
        // Live WebSocket
        .route("/ws", get(routes::ws::ws_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // 7. Bind & Serve
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Listening on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
