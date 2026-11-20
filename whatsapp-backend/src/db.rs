use crate::models::{Conversation, ConversationWithCustomer, Customer, Message};
use chrono::Utc;
use sqlx::{postgres::PgPoolOptions, PgPool};
use tracing::info;
use uuid::Uuid;

pub async fn init_db(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Create tables individually to avoid "multiple commands into a prepared statement" in PostgreSQL
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            whatsapp_number VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'open',
            last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            provider_message_id VARCHAR(255),
            direction VARCHAR(20) NOT NULL,
            sender_type VARCHAR(20) NOT NULL,
            body TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'sent',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(whatsapp_number)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_provider_id ON messages(provider_message_id)")
        .execute(&pool)
        .await?;

    info!("Database initialized and tables verified successfully.");
    Ok(pool)
}

pub async fn get_or_create_customer(
    pool: &PgPool,
    phone: &str,
    name: Option<&str>,
) -> Result<Customer, sqlx::Error> {
    if let Some(existing) = sqlx::query_as::<_, Customer>(
        "SELECT id, whatsapp_number, name, created_at FROM customers WHERE whatsapp_number = $1",
    )
    .bind(phone)
    .fetch_optional(pool)
    .await?
    {
        if name.is_some() && existing.name != name.map(String::from) {
            sqlx::query("UPDATE customers SET name = $1 WHERE id = $2")
                .bind(name)
                .bind(existing.id)
                .execute(pool)
                .await?;
        }
        return Ok(existing);
    }

    let customer = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (id, whatsapp_number, name, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, whatsapp_number, name, created_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(phone)
    .bind(name)
    .bind(Utc::now())
    .fetch_one(pool)
    .await?;

    Ok(customer)
}

pub async fn get_or_create_conversation(
    pool: &PgPool,
    customer_id: Uuid,
) -> Result<Conversation, sqlx::Error> {
    if let Some(existing) = sqlx::query_as::<_, Conversation>(
        "SELECT id, customer_id, status, last_message_at, created_at FROM conversations WHERE customer_id = $1 ORDER BY last_message_at DESC LIMIT 1",
    )
    .bind(customer_id)
    .fetch_optional(pool)
    .await?
    {
        return Ok(existing);
    }

    let conversation = sqlx::query_as::<_, Conversation>(
        r#"
        INSERT INTO conversations (id, customer_id, status, last_message_at, created_at)
        VALUES ($1, $2, 'open', $3, $3)
        RETURNING id, customer_id, status, last_message_at, created_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(customer_id)
    .bind(Utc::now())
    .fetch_one(pool)
    .await?;

    Ok(conversation)
}

pub async fn insert_message(
    pool: &PgPool,
    conversation_id: Uuid,
    provider_message_id: Option<&str>,
    direction: &str,
    sender_type: &str,
    body: &str,
    status: &str,
) -> Result<Message, sqlx::Error> {
    let now = Utc::now();
    let msg = sqlx::query_as::<_, Message>(
        r#"
        INSERT INTO messages (id, conversation_id, provider_message_id, direction, sender_type, body, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, conversation_id, provider_message_id, direction, sender_type, body, status, created_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(conversation_id)
    .bind(provider_message_id)
    .bind(direction)
    .bind(sender_type)
    .bind(body)
    .bind(status)
    .bind(now)
    .fetch_one(pool)
    .await?;

    // Update conversation last_message_at
    sqlx::query("UPDATE conversations SET last_message_at = $1 WHERE id = $2")
        .bind(now)
        .bind(conversation_id)
        .execute(pool)
        .await?;

    Ok(msg)
}

pub async fn list_conversations(pool: &PgPool) -> Result<Vec<ConversationWithCustomer>, sqlx::Error> {
    let query_str = r#"
        SELECT 
            c.id,
            c.customer_id,
            cust.whatsapp_number as customer_number,
            cust.name as customer_name,
            c.status,
            c.last_message_at,
            (
                SELECT m.body 
                FROM messages m 
                WHERE m.conversation_id = c.id 
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_message,
            COALESCE((
                SELECT COUNT(*) 
                FROM messages m 
                WHERE m.conversation_id = c.id AND m.direction = 'inbound' AND m.status != 'read'
            ), 0)::int8 as unread_count
        FROM conversations c
        JOIN customers cust ON c.customer_id = cust.id
        ORDER BY c.last_message_at DESC
    "#;

    let list = sqlx::query_as::<_, ConversationWithCustomer>(query_str)
        .fetch_all(pool)
        .await?;

    Ok(list)
}

pub async fn get_conversation_by_id(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<ConversationWithCustomer>, sqlx::Error> {
    let query_str = r#"
        SELECT 
            c.id,
            c.customer_id,
            cust.whatsapp_number as customer_number,
            cust.name as customer_name,
            c.status,
            c.last_message_at,
            (
                SELECT m.body 
                FROM messages m 
                WHERE m.conversation_id = c.id 
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_message,
            COALESCE((
                SELECT COUNT(*) 
                FROM messages m 
                WHERE m.conversation_id = c.id AND m.direction = 'inbound' AND m.status != 'read'
            ), 0)::int8 as unread_count
        FROM conversations c
        JOIN customers cust ON c.customer_id = cust.id
        WHERE c.id = $1
    "#;

    let conv = sqlx::query_as::<_, ConversationWithCustomer>(query_str)
        .bind(id)
        .fetch_optional(pool)
        .await?;

    Ok(conv)
}

pub async fn get_conversation_messages(
    pool: &PgPool,
    conversation_id: Uuid,
) -> Result<Vec<Message>, sqlx::Error> {
    let messages = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, conversation_id, provider_message_id, direction, sender_type, body, status, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await?;

    // Mark inbound messages as read
    sqlx::query(
        "UPDATE messages SET status = 'read' WHERE conversation_id = $1 AND direction = 'inbound' AND status != 'read'",
    )
    .bind(conversation_id)
    .execute(pool)
    .await?;

    Ok(messages)
}

pub async fn update_message_status(
    pool: &PgPool,
    provider_message_id: &str,
    status: &str,
) -> Result<Option<Message>, sqlx::Error> {
    let updated = sqlx::query_as::<_, Message>(
        r#"
        UPDATE messages
        SET status = $1
        WHERE provider_message_id = $2
        RETURNING id, conversation_id, provider_message_id, direction, sender_type, body, status, created_at
        "#,
    )
    .bind(status)
    .bind(provider_message_id)
    .fetch_optional(pool)
    .await?;

    Ok(updated)
}
