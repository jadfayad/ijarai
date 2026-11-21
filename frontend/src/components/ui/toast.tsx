"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
  /**
   * Context the toast's action applies to (e.g. "dubai:sc-1"). When the user
   * switches context, scoped toasts are dropped so an Undo can't apply to the
   * wrong scenario or city.
   */
  scope?: string;
}

interface ToastOptions {
  action?: ToastItem["action"];
  duration?: number;
  scope?: string;
}

const MAX_VISIBLE = 3;

interface ToastStore {
  toasts: ToastItem[];
  show: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
  retainScope: (scope: string) => void;
}

let toastCounter = 0;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, options) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id: ++toastCounter,
          message,
          action: options?.action,
          duration: options?.duration ?? 5000,
          scope: options?.scope,
        },
      ].slice(-MAX_VISIBLE),
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  retainScope: (scope) =>
    set((s) => {
      const kept = s.toasts.filter((t) => !t.scope || t.scope === scope);
      return kept.length === s.toasts.length ? s : { toasts: kept };
    }),
}));

export function toast(message: string, options?: ToastOptions) {
  useToastStore.getState().show(message, options);
}

/** Drop scoped toasts that don't belong to `scope` (call on context change). */
export function retainToastScope(scope: string) {
  useToastStore.getState().retainScope(scope);
}

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, dismiss]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-overlay backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/40 min-w-[280px] max-w-[420px] animate-in fade-in slide-in-from-top-4 duration-300">
      <span className="flex-1 text-title text-fg">{item.message}</span>
      {item.action && (
        <button
          onClick={() => {
            item.action!.onClick();
            dismiss(item.id);
          }}
          className="text-body font-semibold text-primary hover:text-primary/80 uppercase tracking-wide px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
        >
          {item.action.label}
        </button>
      )}
      <button
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss notification"
        className="text-fg-muted hover:text-fg-secondary p-0.5 rounded-md hover:bg-surface-raised transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[60] flex flex-col items-end gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </div>
  );
}
