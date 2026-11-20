'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Conversation, Message } from '@/types';
import { sendEmployeeReply } from '@/lib/api';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoadingMessages: boolean;
  onMessageSent: (newMsg: Message) => void;
}

export default function ChatWindow({
  conversation,
  messages,
  isLoadingMessages,
  onMessageSent,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversation || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setIsSending(true);
    setErrorMessage(null);

    try {
      const sent = await sendEmployeeReply(conversation.id, text);
      setInputText('');
      onMessageSent(sent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setErrorMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderStatusCheckmarks = (status: string) => {
    if (status === 'read') {
      return (
        <span className="text-sky-500 font-bold ml-1 text-[11px]" title="Read">
          ✓✓
        </span>
      );
    } else if (status === 'delivered') {
      return (
        <span className="text-zinc-400 font-bold ml-1 text-[11px]" title="Delivered">
          ✓✓
        </span>
      );
    } else if (status === 'sent') {
      return (
        <span className="text-zinc-400 ml-1 text-[11px]" title="Sent">
          ✓
        </span>
      );
    } else if (status === 'failed') {
      return (
        <span className="text-red-500 ml-1 text-[11px]" title="Failed to deliver">
          !
        </span>
      );
    }
    return null;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-3xl mb-4 shadow-xs">
          💬
        </div>
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          No Conversation Selected
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
          Select a chat from the inbox list to view the customer’s message history, review automatic bot answers, and reply.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Chat Header */}
      <div className="h-16 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            {conversation.customer_name ? (
              conversation.customer_name.charAt(0).toUpperCase()
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {conversation.customer_name || conversation.customer_number}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium border border-emerald-200/60 dark:border-emerald-800/40">
                WhatsApp Customer
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {conversation.customer_number}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Meta Cloud API Connected</span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-xs text-zinc-400">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-zinc-400">
            No messages in this conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const isCustomer = msg.sender_type === 'customer' || msg.direction === 'inbound';
            const isBot = msg.sender_type === 'bot';
            const isAgent = msg.sender_type === 'agent';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
              >
                {/* Sender badge */}
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  {isCustomer ? (
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {conversation.customer_name || conversation.customer_number} (Customer)
                    </span>
                  ) : isBot ? (
                    <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-200/50 dark:border-teal-800/40">
                      🤖 Radial Bot (Auto-FAQ)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40">
                      👤 Support Agent
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap break-words ${
                    isCustomer
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-xs'
                      : isBot
                      ? 'bg-teal-50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 text-zinc-800 dark:text-zinc-200 rounded-tr-xs'
                      : 'bg-emerald-600 text-white rounded-tr-xs shadow-emerald-900/10'
                  }`}
                >
                  {msg.body}

                  {/* Timestamp & Delivery status */}
                  <div
                    className={`flex items-center justify-end mt-1 space-x-1 text-[10px] ${
                      isAgent ? 'text-emerald-100' : 'text-zinc-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!isCustomer && renderStatusCheckmarks(msg.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Pills */}
      <div className="px-6 py-2 bg-zinc-100/70 dark:bg-zinc-900/40 border-t border-zinc-200/70 dark:border-zinc-800/60 flex items-center space-x-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-medium text-zinc-400 shrink-0">Quick answers:</span>
        <button
          onClick={() => setInputText('Our working hours are Monday to Friday, 9:00 AM - 6:00 PM EST. How can we help?')}
          className="shrink-0 px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          Working hours
        </button>
        <button
          onClick={() => setInputText('Radial Code provides custom web development, mobile apps, WhatsApp integrations, and cloud infrastructure.')}
          className="shrink-0 px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          Services list
        </button>
        <button
          onClick={() => setInputText('Please share a brief summary of your project goals and timeline, and our team will prepare an estimate for you.')}
          className="shrink-0 px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          Quote request
        </button>
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        {errorMessage && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply to customer... (Press Enter to send, Shift+Enter for new line)"
              className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className={`px-5 py-3 rounded-xl font-medium text-xs text-white shadow-xs transition flex items-center space-x-1.5 cursor-pointer ${
              !inputText.trim() || isSending
                ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed text-zinc-500'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
            }`}
          >
            {isSending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

