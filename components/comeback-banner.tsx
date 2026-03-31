"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type ComebackBonusData = {
  multiplier: number;
  absentHours: number;
  labelKo: string;
  labelEn: string;
};

/**
 * Comeback bonus banner — shown when a returning user has a pending
 * reward multiplier. Fetches from /api/welcome-back and displays
 * a glowing animated banner with the multiplier value.
 */
export function ComebackBanner() {
  const [bonus, setBonus] = useState<ComebackBonusData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { t, locale } = useTranslations();

  useEffect(() => {
    let mounted = true;

    async function fetchBonus() {
      try {
        const res = await fetch("/api/welcome-back", { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return;
        const data = await res.json() as { comeback_bonus?: ComebackBonusData | null };
        if (mounted && data.comeback_bonus) {
          setBonus(data.comeback_bonus);
        }
      } catch {
        // Non-critical — silently ignore
      }
    }

    fetchBonus();
    return () => { mounted = false; };
  }, []);

  if (!bonus || dismissed) return null;

  const label = locale === "ko" ? bonus.labelKo : bonus.labelEn;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mb-3 max-w-[720px] overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-4 py-3"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-amber-400/5 via-orange-400/10 to-amber-400/5" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-lg font-bold text-amber-300"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {bonus.multiplier}x
            </motion.span>
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {t("comeback.title")}
              </p>
              <p className="text-xs text-amber-200/70">
                {label} — {t("comeback.description").replace("{multiplier}", String(bonus.multiplier))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/30"
          >
            {t("comeback.claim")}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
