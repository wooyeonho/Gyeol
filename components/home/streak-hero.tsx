"use client";

import { motion } from "framer-motion";
import { StreakFlame } from "@/components/streak-flame";
import { useTranslations } from "@/components/i18n-provider";

interface StreakHeroProps {
  days: number;
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  accentColor?: string;
}

/**
 * Duolingo-style prominent streak + XP display for the home screen.
 * Large, always visible — not hidden when data is zero.
 * When streak=0, shows encouraging CTA instead of empty space.
 */
export function StreakHero({
  days,
  level,
  totalXp,
  xpIntoLevel,
  xpForNext,
  accentColor = "#22d3ee",
}: StreakHeroProps) {
  const { t } = useTranslations();
  const pct = Math.max(0, Math.min(100, (xpIntoLevel / Math.max(1, xpForNext)) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
    >
      {/* Streak flame — large and prominent */}
      <div className="flex flex-col items-center gap-0.5">
        <StreakFlame days={days} size="lg" showCount={false} />
        <span className={`text-lg font-bold tabular-nums ${days > 0 ? "text-amber-400" : "text-white/30"}`}>
          {days}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-white/40">
          {t("streak.label") || "streak"}
        </span>
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-white/10" />

      {/* Level + XP bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <motion.div
              key={level}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
                boxShadow: `0 0 12px ${accentColor}15`,
              }}
            >
              {level}
            </motion.div>
            <span className="text-xs font-medium text-white/60">
              Lv.{level}
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-white/40">
            {xpIntoLevel}/{xpForNext} XP
          </span>
        </div>

        {/* XP progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}90)`,
              boxShadow: `0 0 8px ${accentColor}40`,
            }}
          />
        </div>

        {/* Total XP */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-white/30">
            {t("home.totalXp") || "Total"} {totalXp.toLocaleString()} XP
          </span>
          {days === 0 && (
            <span className="text-[10px] text-amber-400/70">
              {t("home.startStreakCta") || "Start your streak!"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
