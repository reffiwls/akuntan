import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-[#0d2319] text-white border-[#1a3e32]';
        let Icon = Info;
        let iconColor = 'text-emerald-300';

        if (toast.type === 'success') {
          bg = 'bg-[#0d2319] text-white border-emerald-500/40';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          bg = 'bg-rose-950 text-white border-rose-600/50';
          Icon = AlertCircle;
          iconColor = 'text-rose-300';
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-950 text-white border-amber-600/50';
          Icon = AlertCircle;
          iconColor = 'text-amber-300';
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-soft-lg ${bg} transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs">
              <p className="font-extrabold leading-snug">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-stone-200 mt-0.5 leading-relaxed font-medium">{toast.message}</p>
              )}
            </div>
            <button
              id={`dismiss-toast-${toast.id}`}
              onClick={() => onDismiss(toast.id)}
              className="text-stone-300 hover:text-white p-1 -mr-1 -mt-1 rounded-xl transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
