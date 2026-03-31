"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type ExpiryData = {
  expiresInHours: number;
  expiresInMinutes: number;
  multiplier: number;
  urgency: "low" | "medium" | "high" | "critical";
};

const URGENCY_STYLES = {
  low: {
    border: "border-cyan-400/25",
    bg: "bg-cyan-500/10",
    text: "text-cyan-200",
    glow: "from-cyan-400/5 via-cyan-400/10 to-cyan-400/5",
    dot: "bg-cyan-400",
  },
  medium: {
    border: "border-amber-400/25",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    glow: "from-amber-400/5 via-amber-400/10 to-amber-400/5",
    dot: "bg-amber-400",
  },
  high: {
    border: "border-orange-400/30",
    bg: "bg-orange-500/15",
    text: "text-orange-200",
    glow: "from-orange-400/5 via-orange-400/15 to-orange-400/5",
    dot: "bg-orange-400",
  },
  critical: {
    border: "border-red-400/35",
    bg: "bg-red-500/15",
    text: "text-red-200",
    glow: "from-red-400/10 via-red-400/20 to-red-400/10",
    dot: "bg-red-400",
  },
} as const;

/**
 * Reward Expiry Countdown — shows a ticking countdown when unclaimed
 * rewards are about to expire. Placed above the reward progress bar
 * in the hub's expanded view.
 */
export function RewardExpiryCountdown() {
  const [expiry, setExpiry] = useState<ExpiryData | null>(null);
  const { t } = useTranslations();

  useEffect(() => {
    let mounted = true;

    async function fetchExpiry() {
      try {
        const res = await fetch("/api/presence", { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json() as { reward_expiry?: ExpiryData | null };
        if (mounted && data.reward_expiry) {
          setExpiry(data.reward_expiry);
        }
      } catch {
        // Non-critical
      }
    }

    fetchExpiry();

    // Re-fetch every 5 minutes to keep countdown fresh
    const interval = setInterval(fetchExpiry, 300_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!expiry) return null;

  const style = URGENCY_STYLES[expiry.urgency];
  const hours = expiry.expiresInHours;
  const minutes = expiry.expiresInMinutes % 60;

  const timeDisplay = hours > 0
    ? t("reward.expiresIn").replace("{hours}", String(hours)).replace("{minutes}", String(minutes))
    : t("reward.expiresInMinutes").replace("{minutes}", String(Math.floor(expiry.expiresInMinutes)));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-2 overflow-hidden rounded-xl border ${style.border} ${style.bg} px-3 py-2`}
    >
      <div className={`absolute inset-0 animate-pulse bg-gradient-to-r ${style.glow}`} />
      <div className="relative flex items-center gap-2">
        <motion.span
          className={`h-2 w-2 rounded-full ${style.dot}`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className={`text-xs font-medium ${style.text}`}>
          {t("reward.expiryWarning")} — {timeDisplay}
        </p>
        {expiry.multiplier > 1 && (
          <span className={`ml-auto rounded-full border ${style.border} px-2 py-0.5 text-xs font-bold ${style.text}`}>
            x{expiry.multiplier}
          </span>
        )}
      </div>
    </motion.div>
  );
}
