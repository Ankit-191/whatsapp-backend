import { Conversation, KnowledgeResponse, Message, WsEvent } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load conversations: ${res.statusText}`);
  }
  const data = await res.json();
  return data.conversations || [];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load messages: ${res.statusText}`);
  }
  const data = await res.json();
  return data.messages || [];
}

export async function sendEmployeeReply(
  conversationId: string,
  body: string
): Promise<Message> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to send reply: ${res.statusText}`);
  }
  const data = await res.json();
  return data.message;
}

export async function fetchKnowledge(): Promise<KnowledgeResponse> {
  const res = await fetch(`${API_BASE}/api/knowledge`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load knowledge base: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Developer helper: simulate an incoming Meta WhatsApp message locally
 */
export async function simulateIncomingMessage(
  fromNumber: string,
  customerName: string,
  text: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'mock_biz_id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: 'mock_phone_id',
                },
                contacts: [
                  {
                    profile: { name: customerName },
                    wa_id: fromNumber,
                  },
                ],
                messages: [
                  {
                    from: fromNumber,
                    id: `wamid.test_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: 'text',
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  });
  return res.ok;
}

export function subscribeToSupportStream(
  onEvent: (event: WsEvent) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  let ws: WebSocket | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;
  let isClosedManually = false;

  function connect() {
    try {
      ws = new WebSocket(WS_BASE);

      ws.onopen = () => {
        if (onStatusChange) onStatusChange(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent(parsed);
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = () => {
        if (onStatusChange) onStatusChange(false);
        if (!isClosedManually) {
          retryTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    } catch {
      if (onStatusChange) onStatusChange(false);
      if (!isClosedManually) {
        retryTimeout = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosedManually = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    if (ws) ws.close();
  };
}

