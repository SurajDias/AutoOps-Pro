import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const toastListeners = new Set<(toast: Toast) => void>();

export const useToast = () => {
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const toast: Toast = { id: Math.random().toString(36).substr(2, 9), message, type };
    toastListeners.forEach((listener) => listener(toast));
  }, []);
  return { addToast };
};

const config = {
  success: { icon: CheckCircle, border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', color: 'text-emerald-400', bar: 'bg-emerald-500' },
  error:   { icon: XCircle,     border: 'border-rose-500/30',    bg: 'bg-rose-500/10',    color: 'text-rose-400',    bar: 'bg-rose-500' },
  info:    { icon: Info,         border: 'border-primary/30',     bg: 'bg-primary/10',     color: 'text-primary',     bar: 'bg-primary' },
  warning: { icon: AlertTriangle,border: 'border-amber-500/30',  bg: 'bg-amber-500/10',   color: 'text-amber-400',   bar: 'bg-amber-500' },
};

const DURATION = 4000;

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), DURATION);
    };
    toastListeners.add(listener);
    return () => { toastListeners.delete(listener); };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-5 right-5 z-[300] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon: Icon, border, bg, color, bar } = config[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`pointer-events-auto relative flex items-start gap-3 pl-4 pr-3 pt-3.5 pb-4 rounded-xl border backdrop-blur-xl shadow-lg overflow-hidden ${border} ${bg}`}
            >
              {/* Progress bar */}
              <motion.div
                className={`absolute bottom-0 left-0 h-[2px] ${bar} opacity-60`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: DURATION / 1000, ease: 'linear' }}
              />
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
              <p className="flex-1 text-sm text-text-primary font-medium leading-snug">{toast.message}</p>
              <button
                onClick={() => remove(toast.id)}
                className="shrink-0 text-text-muted hover:text-text-primary transition-colors mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
