export interface Customer {
  id: string;
  whatsapp_number: string;
  name?: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  customer_number: string;
  customer_name?: string | null;
  status: 'open' | 'pending' | 'closed';
  last_message_at: string;
  last_message?: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  provider_message_id?: string | null;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'bot' | 'agent';
  body: string;
  status: 'sent' | 'delivered' | 'read' | 'received' | 'failed';
  created_at: string;
}

export interface KnowledgeResponse {
  knowledge: string;
  fallback_message: string;
}

export type WsEvent =
  | { type: 'NewMessage'; data: Message }
  | {
      type: 'MessageStatusUpdated';
      data: {
        id: string;
        provider_message_id?: string | null;
        status: string;
      };
    }
  | { type: 'ConversationUpdated'; data: Conversation }
  | { type: 'Connected'; data: { message: string } };

