"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { create } from "zustand";

import { cn } from "~/lib/utils";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    // auto-dismiss (spec: 3–5s)
    setTimeout(() => {
      useToastStore.getState().dismiss(id);
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
  info: (message: string) => useToastStore.getState().push("info", message),
};

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

/** Rendered once in the app layout. aria-live so screen readers announce, no focus steal. */
export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[800] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "glass-modal animate-pop-in pointer-events-auto flex items-center gap-2.5 !rounded-lg px-3.5 py-2.5",
            )}
            role="status"
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4.5 shrink-0",
                t.kind === "success" && "text-ink-success",
                t.kind === "error" && "text-ink-danger",
                t.kind === "info" && "text-icon-brand",
              )}
            />
            <p className="flex-1 text-md text-ink">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-icon-subtle hover:bg-subtle-hover"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
