'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';
import KnowledgeModal from '@/components/KnowledgeModal';
import SimulateModal from '@/components/SimulateModal';
import QrScanModal from '@/components/QrScanModal';
import { Conversation, Message } from '@/types';
import { fetchConversations, fetchMessages, subscribeToSupportStream } from '@/lib/api';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch {
      // Backend might be warming up
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Load messages for the selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await fetchMessages(convId);
      setMessages(data);
    } catch {
      // Handle error gracefully
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // When user selects a conversation
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.id);
    // Mark as read in local view
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
    );
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // WebSocket Subscription
  useEffect(() => {
    const unsubscribe = subscribeToSupportStream(
      (event) => {
        if (event.type === 'NewMessage') {
          const newMsg = event.data;
          setMessages((prev) => {
            if (
              selectedConversation &&
              newMsg.conversation_id === selectedConversation.id
            ) {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            }
            return prev;
          });
          loadConversations();
        } else if (event.type === 'MessageStatusUpdated') {
          const { id, status } = event.data;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: status as Message['status'] } : m))
          );
        } else if (event.type === 'ConversationUpdated') {
          loadConversations();
        }
      },
      (connected) => {
        setIsConnected(connected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedConversation, loadConversations]);

  // Polling fallback every 8 seconds if WebSocket is offline
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id).then(setMessages).catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isConnected, selectedConversation, loadConversations]);

  const handleMessageSent = (newMsg: Message) => {
    setMessages((prev) => [...prev, newMsg]);
    loadConversations();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-900 select-none">
      <Header
        isConnected={isConnected}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenScanQr={() => setIsQrScanOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Inbox conversations (full-width on mobile when no chat selected) */}
        <div className={`h-full ${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-auto shrink-0`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            isLoading={isLoadingConversations}
          />
        </div>

        {/* Center / Right: Chat thread (full-width on mobile when chat selected) */}
        <div className={`h-full flex-1 ${selectedConversation ? 'flex' : 'hidden md:flex'} w-full overflow-hidden`}>
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onMessageSent={handleMessageSent}
            onBack={() => setSelectedConversation(null)}
          />
        </div>
      </div>

      {/* Knowledge Modal */}
      <KnowledgeModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />

      {/* Simulator Modal for Local / Preview testing */}
      <SimulateModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSuccess={() => {
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation.id);
          }
        }}
      />

      {/* WhatsApp QR Scanner Modal */}
      <QrScanModal
        isOpen={isQrScanOpen}
        onClose={() => setIsQrScanOpen(false)}
      />
    </div>
  );
}
