use crate::{
    config::Config,
    faq::FaqEngine,
    meta::MetaClient,
    models::WsEvent,
};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub meta_client: MetaClient,
    pub faq_engine: FaqEngine,
    pub ws_tx: broadcast::Sender<WsEvent>,
}

impl AppState {
    pub fn new(pool: PgPool, config: Config) -> Self {
        let (ws_tx, _) = broadcast::channel(100);
        let meta_client = MetaClient::new(
            config.meta_access_token.clone(),
            config.meta_phone_number_id.clone(),
            config.meta_graph_api_version.clone(),
        );
        let faq_engine = FaqEngine::new(&config.knowledge_dir);

        Self {
            pool,
            config,
            meta_client,
            faq_engine,
            ws_tx,
        }
    }
}

pub type SharedState = Arc<AppState>;

