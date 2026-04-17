"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ToastState {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastStore {
  toast: ToastState | null;
  show: (message: string, options?: { action?: ToastState["action"]; duration?: number }) => void;
  dismiss: () => void;
}

let toastCounter = 0;

const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  show: (message, options) =>
    set({
      toast: {
        id: ++toastCounter,
        message,
        action: options?.action,
        duration: options?.duration ?? 5000,
      },
    }),
  dismiss: () => set({ toast: null }),
}));

export function toast(
  message: string,
  options?: { action?: { label: string; onClick: () => void }; duration?: number },
) {
  useToastStore.getState().show(message, options);
}

export function Toaster() {
  const current = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, current.duration);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[60] animate-in fade-in slide-in-from-top-4 duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.12] bg-[rgba(18,18,30,0.94)] backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/40 min-w-[280px] max-w-[420px]">
        <span className="flex-1 text-[13px] text-white/85">{current.message}</span>
        {current.action && (
          <button
            onClick={() => {
              current.action!.onClick();
              dismiss();
            }}
            className="text-[12px] font-semibold text-primary hover:text-primary/80 uppercase tracking-wide px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
          >
            {current.action.label}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="text-white/30 hover:text-white/70 p-0.5 rounded-md hover:bg-white/[0.06] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
