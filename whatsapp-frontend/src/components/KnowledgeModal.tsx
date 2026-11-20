'use client';

import React, { useEffect, useState } from 'react';
import { fetchKnowledge } from '@/lib/api';
import { KnowledgeResponse } from '@/types';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeModal({ isOpen, onClose }: KnowledgeModalProps) {
  const [data, setData] = useState<KnowledgeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchKnowledge()
        .then((res) => setData(res))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📖</span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Bot Knowledge & Auto-Replies
              </h3>
              <p className="text-xs text-zinc-500">
                Preloaded markdown files used by Rust backend to answer customer WhatsApp queries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-400">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading FAQ knowledge base...
            </div>
          ) : data ? (
            <>
              {/* Fallback Message Card */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl">
                <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                  Default Fallback Message:
                </span>
                <p className="text-amber-900 dark:text-amber-200">
                  {data.fallback_message}
                </p>
              </div>

              {/* Markdown Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Source Knowledge (company.md, services.md, faqs.md):
                  </span>
                  <button
                    onClick={() => handleCopy(data.knowledge)}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-[11px] text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                  >
                    {copied ? '✓ Copied' : 'Copy All'}
                  </button>
                </div>
                <pre className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {data.knowledge}
                </pre>
              </div>
            </>
          ) : (
            <div className="text-center text-zinc-400 py-8">
              Failed to load knowledge content. Ensure the Rust backend is running.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

