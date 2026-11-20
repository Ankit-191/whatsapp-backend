'use client';

import React, { useState } from 'react';
import { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string | null;
  onSelect: (conv: Conversation) => void;
  isLoading: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = conversations.filter((c) => {
    const q = searchTerm.toLowerCase();
    const phone = c.customer_number.toLowerCase();
    const name = (c.customer_name || '').toLowerCase();
    const lastMsg = (c.last_message || '').toLowerCase();
    return phone.includes(q) || name.includes(q) || lastMsg.includes(q);
  });

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Inbox
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
            {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, number, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-emerald-500 rounded-lg outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-colors"
          />
          <svg
            className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {isLoading && conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading conversations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            {searchTerm ? 'No matching conversations' : 'No conversations yet.'}
            <p className="mt-1 text-zinc-500">
              When a customer messages on WhatsApp, their chat will appear here.
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left p-3.5 transition-colors flex items-start space-x-3 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-xs">
                  {conv.customer_name ? (
                    conv.customer_name.charAt(0).toUpperCase()
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {conv.customer_name || conv.customer_number}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0 ml-1">
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>

                  {conv.customer_name && (
                    <div className="text-[11px] text-zinc-400 truncate mb-1">
                      {conv.customer_number}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate pr-2">
                      {conv.last_message || 'No messages yet'}
                    </p>

                    {conv.unread_count > 0 && (
                      <span className="shrink-0 text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

