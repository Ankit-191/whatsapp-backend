# Backend — WhatsApp Support

## Technology
- Rust
- Axum + Tokio
- PostgreSQL
- SQLx
- Deploy on Render
- Meta WhatsApp Business Cloud API

## Purpose
The Rust backend connects the company's WhatsApp Business number to the dashboard.

Customers only use WhatsApp. The Next.js dashboard is for company employees.

## How it works

1. Customer sends `Hi` to the company's WhatsApp Business number.
2. Meta WhatsApp Cloud API sends the incoming message to our Rust webhook.
3. Rust receives the message and saves it in PostgreSQL.
4. Rust checks the FAQ content in Markdown files.
5. Rust sends the automatic reply through Meta WhatsApp Cloud API.
6. The message and conversation appear in the Next.js dashboard.
7. If an employee replies from the dashboard, Rust sends that reply to the customer through Meta.

## Markdown files

Keep simple company information and predefined answers in these files:

```text
knowledge/
├── company.md
├── services.md
└── faqs.md
```

Rust reads these files to find an answer. If it cannot find a suitable answer, it can send a fallback message such as:

`Thanks for contacting Radial Code. Our team will get back to you shortly.`

Markdown files contain FAQ/business information only. Customer chats and messages must be stored in PostgreSQL.

## Database

Use only the basic tables initially:

### customers
- id
- whatsapp_number
- name
- created_at

### conversations
- id
- customer_id
- status
- last_message_at
- created_at

### messages
- id
- conversation_id
- provider_message_id
- direction (inbound/outbound)
- sender_type (customer/bot/agent)
- body
- status
- created_at

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Check backend |
| GET | `/webhooks/whatsapp` | Meta webhook verification |
| POST | `/webhooks/whatsapp` | Receive WhatsApp messages/status |
| GET | `/api/conversations` | Get inbox conversations |
| GET | `/api/conversations/:id/messages` | Get chat messages |
| POST | `/api/conversations/:id/messages` | Send employee reply |

Use WebSocket at `/ws` to notify the dashboard when a new message arrives or a message status changes.

## Meta WhatsApp setup

1. Create/configure a Meta Developer app.
2. Add the WhatsApp product.
3. Connect/register the company's WhatsApp Business number.
4. Configure the public Rust webhook URL in Meta.
5. Set the webhook verify token.
6. Subscribe to incoming message and message status events.
7. Store the Meta credentials securely in Render environment variables.

The example number `1234567890` is only a placeholder. A real eligible business number must be connected through Meta. Customers message that number on WhatsApp; they do not need the dashboard link.

## Backend environment variables

```env
DATABASE_URL=...
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
META_APP_SECRET=...
META_VERIFY_TOKEN=...
META_GRAPH_API_VERSION=...
FRONTEND_ORIGIN=https://YOUR-FRONTEND.vercel.app
```

Never commit real credentials to GitHub.

## Deployment
- Deploy the Rust API on Render.
- Use a persistent PostgreSQL database for real customer conversations.
- Configure the Render HTTPS webhook URL in Meta.
- Configure CORS for the Vercel frontend domain.
- Keep the backend running continuously for reliable webhook handling.

Render free services may sleep and are not suitable for reliable production WhatsApp webhooks. Use an always-on paid service and persistent database for production.

## First-version checklist
- [ ] Receive a WhatsApp message through Meta webhook.
- [ ] Save customer and message in PostgreSQL.
- [ ] Read FAQ answers from Markdown files.
- [ ] Send an automatic WhatsApp reply.
- [ ] Show incoming messages in the dashboard.
- [ ] Send employee replies from the dashboard to WhatsApp.
