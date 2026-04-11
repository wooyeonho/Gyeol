"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ShieldState = {
  shield_count: number;
  price: number;
};

/**
 * Phase 1-1: User-facing streak shield shop.
 *
 * Lives beside the streak display. Shows the current shield count,
 * the coin price of the next shield, and a one-click purchase button
 * that spends coins and awards one shield via /api/streak/shield.
 *
 * Renders nothing while the initial fetch is in flight so the home
 * page doesn't jump around on first paint.
 */
export function ShieldShop({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<ShieldState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/streak/shield", { cache: "no-store" });
      if (res.ok) {
        setState((await res.json()) as ShieldState);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/streak/shield", { method: "POST" });
      if (res.status === 402) {
        setError("코인이 부족해요");
      } else if (res.ok) {
        const json = (await res.json()) as { shield_count: number | null };
        setState((prev) =>
          prev
            ? {
                ...prev,
                shield_count: json.shield_count ?? prev.shield_count + 1,
              }
            : prev,
        );
        setFlash("🛡️ 쉴드 +1");
        setTimeout(() => setFlash(null), 1600);
      } else {
        setError("구매 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!state) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-200 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
      >
        🛡️ ×{state.shield_count} · +1 ({state.price}🪙)
      </button>
    );
  }

  return (
    <div className="relative mt-3 flex items-center justify-between rounded-xl border border-blue-400/20 bg-blue-500/[0.06] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🛡️</span>
        <div>
          <p className="text-xs font-semibold text-blue-100">
            스트릭 쉴드 ×{state.shield_count}
          </p>
          <p className="text-[10px] text-blue-200/60">
            하루 빠뜨려도 자동 방어
          </p>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={buy}
        disabled={busy}
        whileTap={{ scale: 0.94 }}
        className="flex items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100 transition-colors hover:bg-amber-400/25 disabled:opacity-50"
      >
        {busy ? "…" : `+1 · ${state.price} 🪙`}
      </motion.button>
      <AnimatePresence>
        {flash && (
          <motion.span
            className="absolute -top-3 right-3 text-[10px] font-semibold text-emerald-300"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {flash}
          </motion.span>
        )}
        {error && (
          <motion.span
            className="absolute -bottom-4 right-3 text-[10px] font-semibold text-rose-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setError(null), 1800)}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
