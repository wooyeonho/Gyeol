"use client";

import { AnimatePresence, motion } from "framer-motion";
import { spring, layer } from "@/lib/design/tokens";
import { useToastStore, type ToastType } from "@/store/toast-store";

const icons: Record<ToastType, string> = {
  success: "\u2714",
  error: "\u2716",
  info: "\u2139",
  warning: "\u26A0",
};

const colors: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
};

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{ zIndex: layer.toast }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={spring.pop}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 backdrop-blur-md shadow-lg ${colors[t.type]}`}
          >
            <span className="text-base flex-shrink-0">{icons[t.type]}</span>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={t.action.onClick}
                className="flex-shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 ml-1 text-white/40 hover:text-white/70 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
