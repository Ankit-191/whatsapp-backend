'use client';

import React, { useEffect, useState } from 'react';

interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BridgeStatus {
  status: 'connected' | 'scan_needed' | 'initializing' | 'error';
  connectedUser: string | null;
  qr: string | null;
}

export default function QrScanModal({ isOpen, onClose }: QrScanModalProps) {
  const [data, setData] = useState<BridgeStatus>({
    status: 'initializing',
    connectedUser: null,
    qr: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        let res = await fetch(`${apiUrl}/api/bridge/status`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:3001/api/status');
        }
        if (!res.ok) throw new Error('Bridge not responding');
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setData({
            status: 'error',
            connectedUser: null,
            qr: null,
          });
          setLoading(false);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.9C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Connect WhatsApp
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Scan with your phone to link Radial Code Bot
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center min-h-[260px]">
          {loading && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">Checking bridge status...</p>
            </div>
          )}

          {!loading && data.status === 'connected' && (
            <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl w-full">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                WhatsApp Connected & Active!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                +{data.connectedUser}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                Radial Code Bot is replying automatically to incoming messages.
              </p>
            </div>
          )}

          {!loading && data.status === 'scan_needed' && data.qr && (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700">
                <img
                  src={data.qr}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 rounded-md"
                />
              </div>

              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-300 w-full space-y-1">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">How to scan:</p>
                <p>1. Open WhatsApp on your phone</p>
                <p>2. Tap <strong>Linked Devices</strong> ➔ <strong>Link a device</strong></p>
                <p>3. Point your camera at this QR code</p>
              </div>
            </div>
          )}

          {!loading && data.status === 'error' && (
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 w-full">
              <p className="font-semibold">WhatsApp Bridge is starting...</p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                Please wait a moment while the bridge initializes.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

