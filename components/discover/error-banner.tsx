"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Shared error banner with retry button and auto-dismiss.
 */
export function ErrorBanner({
  message,
  onRetry,
  autoDismissMs = 8000,
}: {
  message: string;
  /** When provided, shows a retry button. */
  onRetry?: () => void;
  /** Auto-dismiss after ms. Set 0 to disable. */
  autoDismissMs?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    if (!autoDismissMs) return;
    const t = setTimeout(() => setVisible(false), autoDismissMs);
    return () => clearTimeout(t);
  }, [message, autoDismissMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3"
        >
          <p className="text-sm text-red-200">{message}</p>
          <div className="flex shrink-0 items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/25 active:scale-[0.97]"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="text-red-300/50 hover:text-red-200 transition-colors"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
