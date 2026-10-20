import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-5 sm:bottom-5 z-50 flex flex-col gap-2 sm:max-w-md w-auto pointer-events-none">
      {toasts.map(toast => {
        let Icon = CheckCircle;
        let borderClass = 'border-emerald-500/30 bg-emerald-950/95 text-emerald-100';
        let iconClass = 'text-emerald-400';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-rose-500/30 bg-rose-950/95 text-rose-100';
          iconClass = 'text-rose-400';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-amber-500/30 bg-amber-950/95 text-amber-100';
          iconClass = 'text-amber-400';
        } else if (toast.type === 'info') {
          Icon = Info;
          borderClass = 'border-sky-500/30 bg-sky-950/95 text-sky-100';
          iconClass = 'text-sky-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all text-xs sm:text-sm font-medium ${borderClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/60 hover:text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center p-1 rounded hover:bg-white/10 shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
