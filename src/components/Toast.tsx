'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 bg-surface border border-brand-blue/40 text-white rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
      <CheckCircle2 className="w-5 h-5 text-brand-success flex-shrink-0" />
      <span className="text-xs sm:text-sm font-semibold tracking-tight">{message}</span>
      <button
        onClick={onClose}
        className="w-5 h-5 ml-1 text-text-secondary hover:text-white flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
