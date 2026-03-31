"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

/**
 * Real-time active user counter — social proof widget.
 *
 * Polls /api/presence every 30s and displays a pulsing green dot
 * with the count of currently active users. The counter smoothly
 * animates between values to feel "alive".
 */
export function ActiveCounter({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);
  const { t } = useTranslations();

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const res = await fetch("/api/presence", { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json() as { active: number };
        if (mounted && typeof data.active === "number") {
          setPrevCount((prev) => prev ?? data.active);
          setCount(data.active);
        }
      } catch {
        // Silently ignore — counter is non-critical UI
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (count === null) return null;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            className="text-xs text-white/70"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    );
  }

  const direction = prevCount !== null && count > prevCount ? 1 : -1;

  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          className="text-xs font-medium text-white/80"
          initial={{ opacity: 0, y: direction * 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -direction * 6 }}
          transition={{ duration: 0.25 }}
        >
          {t("presence.activeNow").replace("{count}", String(count))}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
