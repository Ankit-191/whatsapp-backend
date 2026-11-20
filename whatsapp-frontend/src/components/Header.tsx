'use client';

import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  onOpenKnowledge: () => void;
  onOpenSimulate: () => void;
}

export default function Header({
  isConnected,
  onOpenKnowledge,
  onOpenSimulate,
}: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
          <svg
            className="w-5 h-5 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.9C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              Radial Code
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
              WhatsApp Support
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Internal Agent Dashboard & Auto-FAQ Engine
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* WebSocket Connection status */}
        <div className="flex items-center space-x-2 text-xs bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            }`}
          />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
            {isConnected ? 'Live WebSocket Active' : 'Connecting to Backend...'}
          </span>
        </div>

        {/* View FAQ Knowledge */}
        <button
          onClick={onOpenKnowledge}
          className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <span>📖</span>
          <span>Bot Knowledge</span>
        </button>

        {/* Simulate WhatsApp Message Button */}
        <button
          onClick={onOpenSimulate}
          className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <span>⚡</span>
          <span>Simulate Customer</span>
        </button>
      </div>
    </header>
  );
}

