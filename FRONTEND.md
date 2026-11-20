# Frontend — WhatsApp Support Dashboard

## Technology
- Next.js
- TypeScript
- Deploy on Vercel
- Connect to the Rust backend API

## Purpose
This dashboard is only for the Radial Code team. Customers do not use this website.

A customer sends a message to the company's WhatsApp Business number. The backend receives it through Meta WhatsApp Cloud API and sends an automatic reply. The team can see the conversation and reply manually from this dashboard.

## Keep the frontend simple

Build only these screens:

### 1. Inbox
- Show customer WhatsApp number/name.
- Show latest message and time.
- Show unread conversations.
- Click a customer to open the chat.

### 2. Chat
- Show the conversation history.
- Show customer and bot messages.
- Allow an employee to type and send a reply.
- Show basic message status when available.

### 3. Bot replies (simple)
- Show the FAQ/automatic reply content loaded by the backend.
- No complicated settings or extra admin pages in the first version.

A login screen can be added if the dashboard is private to company employees. Do not build separate reports, CRM, departments, agent management, or other pages in the first version.

## How it connects
1. Frontend requests conversations and messages from the Rust backend.
2. Frontend sends an employee reply to the Rust backend.
3. Rust sends that reply to the customer using Meta WhatsApp Cloud API.
4. Use WebSocket for new messages and live chat updates.

## Environment variables

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.onrender.com
NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND.onrender.com/ws
```

Never put Meta access tokens or database credentials in frontend environment variables.

## Deployment
- Push frontend code to GitHub.
- Deploy the Next.js project on Vercel.
- Set the backend API URL.
- Allow the Vercel domain in backend CORS settings.

## First-version checklist
- [ ] Inbox shows incoming WhatsApp conversations.
- [ ] Chat screen shows message history.
- [ ] Employee can send a reply from the dashboard.
- [ ] New messages appear without refreshing.
- [ ] No unnecessary pages or features.
