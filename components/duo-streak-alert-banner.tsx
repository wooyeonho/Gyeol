"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type DuoStreakRiskData = {
  riskLevel: "medium" | "high";
  hoursUntilLoss: number;
  friendName: string;
  friendAgentId: string;
  streakDays: number;
};

/**
 * Duo Streak Risk Alert Banner — warns users when their shared streak
 * with a friend is about to break. Displayed in the hub when risk is detected.
 */
export function DuoStreakAlertBanner() {
  const [risk, setRisk] = useState<DuoStreakRiskData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    let mounted = true;

    async function fetchRisk() {
      try {
        const res = await fetch("/api/presence", { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json() as { duo_streak_risk?: DuoStreakRiskData | null };
        if (mounted && data.duo_streak_risk) {
          setRisk(data.duo_streak_risk);
        }
      } catch {
        // Non-critical
      }
    }

    fetchRisk();
    return () => { mounted = false; };
  }, []);

  return (
    <AnimatePresence>
      {risk && !dismissed && (() => {
        const isHigh = risk.riskLevel === "high";
        const hoursText = risk.hoursUntilLoss < 1
          ? `< 1h`
          : `${Math.floor(risk.hoursUntilLoss)}h`;

        return (
          <motion.div
            key="duo-streak-alert"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`relative mx-auto mb-3 max-w-[720px] overflow-hidden rounded-2xl border px-4 py-3 ${
              isHigh
                ? "border-red-400/30 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15"
                : "border-orange-400/25 bg-gradient-to-r from-orange-500/12 via-amber-500/8 to-orange-500/12"
            }`}
          >
            {/* Pulse glow */}
            {isHigh && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5" />
            )}

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                    isHigh ? "bg-red-500/20" : "bg-orange-500/15"
                  }`}
                  animate={isHigh ? { scale: [1, 1.08, 1] } : undefined}
                  transition={isHigh ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : undefined}
                >
                  <span className={isHigh ? "text-red-300" : "text-orange-300"}>
                    {hoursText}
                  </span>
                </motion.div>
                <div>
                  <p className={`text-sm font-semibold ${isHigh ? "text-red-200" : "text-orange-200"}`}>
                    {t("duo.riskTitle")}
                  </p>
                  <p className={`text-xs ${isHigh ? "text-red-200/70" : "text-orange-200/70"}`}>
                    {t("duo.riskBody")
                      .replace("{name}", risk.friendName)
                      .replace("{hours}", hoursText)
                      .replace("{days}", String(risk.streakDays))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isHigh
                    ? "border-red-400/30 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                    : "border-orange-400/25 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
                }`}
              >
                {t("duo.chatNow")}
              </button>
            </div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
