# WhatsApp Support Platform — Radial Code

This repository contains the complete full-stack solution for Radial Code's WhatsApp Business customer support system, consisting of a high-performance **Rust (Axum)** backend connected to Meta WhatsApp Cloud API and a modern **Next.js (TypeScript)** agent dashboard.

---

## Architecture Overview

```text
                                  +------------------------------+
                                  |    Customer on WhatsApp      |
                                  +--------------+---------------+
                                                 |
                                     (WhatsApp Messages)
                                                 v
                                  +------------------------------+
                                  | Meta WhatsApp Cloud API       |
                                  +--------------+---------------+
                                                 |
                                     (Webhooks / REST API)
                                                 v
+-------------------------------+  PostgreSQL  +------------------------------+
| Next.js Employee Dashboard    |<============>| Rust (Axum + Tokio) Backend  |
| - Live Inbox & Unread Count   | (WebSocket   | - Meta Webhook Verification  |
| - Chat History & Agent Reply  |  & REST API) | - Auto-FAQ Markdown Engine   |
| - Bot Knowledge Preview       |              | - Postgres Database Schema   |
+-------------------------------+              +------------------------------+
```

---

## Directory Structure

```text
whatsapp-chat/
├── whatsapp-backend/         # Rust Axum Web Server & Meta Integration
│   ├── src/
│   │   ├── config.rs         # Environment variable configuration
│   │   ├── db.rs             # PostgreSQL connection pool & queries
│   │   ├── faq.rs            # Markdown knowledge parser & auto-responder
│   │   ├── meta.rs           # Meta WhatsApp Business Cloud API client
│   │   ├── models.rs         # Data structures & Webhook payloads
│   │   ├── routes/
│   │   │   ├── health.rs     # GET /health
│   │   │   ├── whatsapp.rs   # GET/POST /webhooks/whatsapp
│   │   │   ├── conversations.rs # GET /api/conversations, /messages, etc.
│   │   │   └── ws.rs         # GET /ws live WebSocket feed
│   │   └── main.rs           # Server setup, routing, CORS & listener
│   ├── knowledge/            # Markdown Knowledge Base for Auto-Bot
│   │   ├── company.md        # Company overview, office hours & contacts
│   │   ├── services.md       # Offered engineering & automation services
│   │   └── faqs.md           # Frequently asked questions & answers
│   ├── migrations/           # PostgreSQL DDL migrations
│   │   └── 0001_init.sql     # Customers, Conversations, Messages tables
│   ├── Cargo.toml            # Rust dependencies (Axum, Tokio, SQLx, Serde)
│   ├── Dockerfile            # Container build for deployment
│   ├── render.yaml           # Blueprint for 1-click Render deployment
│   └── .env.example          # Sample environment variables
│
├── whatsapp-frontend/        # Next.js 16 + TypeScript Support Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx    # Root layout & styling
│   │   │   └── page.tsx      # Main Live Inbox & Chat interface
│   │   ├── components/
│   │   │   ├── Header.tsx    # App header & WebSocket indicator
│   │   │   ├── ConversationList.tsx # Inbox search, unread badges, list
│   │   │   ├── ChatWindow.tsx # Live message thread & reply form
│   │   │   ├── KnowledgeModal.tsx   # Markdown bot knowledge preview
│   │   │   └── SimulateModal.tsx    # Inbound WhatsApp test simulator
│   │   ├── lib/
│   │   │   └── api.ts        # REST and WebSocket client
│   │   └── types/
│   │       └── index.ts      # TypeScript interfaces
│   ├── package.json
│   └── .env.local.example
│
├── BACKEND.md                # Backend technical specifications
└── FRONTEND.md               # Frontend technical specifications
```

---

## Getting Started

### 1. Backend Setup (Rust)

1. Navigate to the backend directory:
   ```bash
   cd whatsapp-backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your PostgreSQL connection string and Meta credentials:
   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/whatsapp_support
   META_ACCESS_TOKEN=your_meta_system_user_token
   META_PHONE_NUMBER_ID=your_meta_phone_number_id
   META_VERIFY_TOKEN=radial_code_verify_token
   PORT=8080
   ```
4. Run the backend:
   ```bash
   cargo run
   ```

### 2. Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd whatsapp-frontend
   ```
2. Configure `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
