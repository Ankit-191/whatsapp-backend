use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub meta_access_token: String,
    pub meta_phone_number_id: String,
    pub meta_verify_token: String,
    pub meta_graph_api_version: String,
    pub frontend_origin: String,
    pub port: u16,
    pub knowledge_dir: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/whatsapp_support".to_string());
        let meta_access_token = env::var("META_ACCESS_TOKEN").unwrap_or_default();
        let meta_phone_number_id = env::var("META_PHONE_NUMBER_ID").unwrap_or_default();
        let meta_verify_token = env::var("META_VERIFY_TOKEN").unwrap_or_else(|_| "radial_code_verify_token".to_string());
        let meta_graph_api_version = env::var("META_GRAPH_API_VERSION").unwrap_or_else(|_| "v21.0".to_string());
        let frontend_origin = env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "*".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080);
        let knowledge_dir = env::var("KNOWLEDGE_DIR").unwrap_or_else(|_| "knowledge".to_string());

        Self {
            database_url,
            meta_access_token,
            meta_phone_number_id,
            meta_verify_token,
            meta_graph_api_version,
            frontend_origin,
            port,
            knowledge_dir,
        }
    }
}

