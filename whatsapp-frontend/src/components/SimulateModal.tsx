'use client';

import React, { useState } from 'react';
import { simulateIncomingMessage } from '@/lib/api';

interface SimulateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SimulateModal({
  isOpen,
  onClose,
  onSuccess,
}: SimulateModalProps) {
  const [phone, setPhone] = useState('+919876543210');
  const [name, setName] = useState('Rahul Verma');
  const [text, setText] = useState('Hi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const ok = await simulateIncomingMessage(phone.trim(), name.trim(), text.trim());
      if (ok) {
        setStatusMsg('Message successfully sent to Rust webhook! Updating inbox...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMsg('Backend returned an error. Check backend logs.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send simulation';
      setStatusMsg(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleMessages = [
    { label: '👋 Greeting (Menu Buttons)', text: 'Hi' },
    { label: '🛠 Services', text: 'btn_services' },
    { label: '🎓 Courses', text: 'btn_courses' },
    { label: '📞 Contact Us', text: 'btn_contact' },
    { label: '👥 Team', text: 'Who is in the RadialCode team?' },
    { label: '💼 Careers', text: 'Do you have job openings for frontend developers?' },
    { label: '🏆 Portfolio', text: 'Show me your case studies and delivered projects' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Simulate Customer WhatsApp Message
              </h3>
              <p className="text-xs text-zinc-500">
                Test webhook intake, FAQ auto-reply, interactive buttons, and Neon DB storage
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Customer WhatsApp Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              placeholder="+919876543210"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Customer Name (Meta Profile)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 text-xs"
              placeholder="e.g. Rahul Verma"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Inbound Message / Button Click
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sampleMessages.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setText(sample.text)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer border border-zinc-200 dark:border-zinc-700"
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 text-xs resize-none"
              placeholder="Type message text or select above..."
            />
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
              {statusMsg}
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Simulating...' : 'Send Message to Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
