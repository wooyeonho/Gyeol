"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "@/components/i18n-provider";

const WEEKDAY_LABELS: Record<string, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["S", "M", "T", "W", "T", "F", "S"],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
  es: ["D", "L", "M", "X", "J", "V", "S"],
};

const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100] as const;

type StreakDisplayProps = {
  days: number;
  todayActive: boolean;
  weeklyActivity?: boolean[];
  locale?: Locale;
  compact?: boolean;
};

export function StreakDisplay({
  days,
  todayActive,
  weeklyActivity = [false, false, false, false, false, false, false],
  locale = "ko",
  compact = false,
}: StreakDisplayProps) {
  const isMilestone = days > 0 && days % 7 === 0;
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const showCelebration = isMilestone && !celebrationDismissed;
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > days) ?? null;
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = (midnight.getTime() - now.getTime()) / 3600000;
  const showRiskTimer = days > 0 && !todayActive && hoursUntilMidnight <= 4;
  const { t } = useTranslations();
  const countdownLabel = (() => {
    const totalMinutes = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}${t("streak.countdownH")} ${minutes}${t("streak.countdownM")}`;
  })();

  const streakColor = days >= 30
    ? "#f59e0b"
    : days >= 7
      ? "#fb923c"
      : days >= 3
        ? "#fbbf24"
        : "#ffffff40";

  const streakLabel = days === 0
    ? t("streak.startFirst")
    : t("streak.dayStreak").replace("{count}", String(days));

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {days > 0 && (
          <motion.span
            className="text-sm"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
          >
            🔥
          </motion.span>
        )}
        <span className="text-xs font-medium" style={{ color: streakColor }}>
          {days}
        </span>
      </motion.div>
    );
  }

  if (days === 0) {
    return (
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-start gap-4">
          <motion.div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/10 text-3xl"
            animate={{ rotate: [0, -6, 6, -3, 3, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          >
            🔥
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
              {t("streak.label")}
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {t("streak.emptyTitle")}
            </p>
            <p className="mt-1 text-sm leading-5 text-white/75">
              {t("streak.emptyBody")}
            </p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
              initial={{ width: "0%" }}
              animate={{ width: "4%" }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
          <span className="text-[11px] font-medium text-amber-100/85">
            {t("streak.emptyFirstMilestone")}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => {
              setTimeout(() => setCelebrationDismissed(true), 2500);
            }}
          >
            <span className="text-4xl">🎉</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">
            {t("streak.label")}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <motion.span
              className="text-2xl font-semibold"
              style={{ color: streakColor }}
              key={days}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {days}
            </motion.span>
            <span className="text-sm text-white/72">{streakLabel}</span>
          </div>
        </div>
        {days > 0 && (
          <motion.div
            className="text-2xl"
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            🔥
          </motion.div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">
            {t("streak.nextMilestone")}
          </p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white/85">
            {nextMilestone
              ? t("streak.daysLeft").replace("{count}", String(nextMilestone - days))
              : t("streak.peakTier")}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STREAK_MILESTONES.map((milestone) => {
            const reached = days >= milestone;
            const isNext = nextMilestone === milestone;
            return (
              <span
                key={milestone}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  reached
                    ? "border-amber-300/45 bg-amber-400/16 text-amber-100"
                    : isNext
                      ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
                      : "border-white/12 bg-white/5 text-white/72"
                }`}
              >
                {milestone}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-1">
        {weeklyActivity.map((active, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dayIndex = d.getDay();
          const labels = WEEKDAY_LABELS[locale] ?? WEEKDAY_LABELS.en;
          const dayLabel = labels[dayIndex];
          const isToday = i === weeklyActivity.length - 1;
          return (
            <motion.div
              key={i}
              className="flex flex-1 flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="text-[11px] text-white/55">{dayLabel}</span>
              <div
                className={`h-6 w-full rounded-md transition-all ${
                  active
                    ? "shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                    : ""
                } ${isToday && !active ? "border border-dashed border-white/20" : ""}`}
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${streakColor}, ${streakColor}88)`
                    : "rgba(255,255,255,0.05)",
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {days > 0 && !todayActive && (
        <motion.div
          className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-amber-200/80">
            {`⚠️ ${t("streak.warningKeep").replace("{count}", String(days))}`}
          </p>
        </motion.div>
      )}
      {showRiskTimer && (
        <motion.div
          className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <p className="text-sm text-red-100/90">
            {t("streak.dangerTimer").replace("{countdown}", countdownLabel)}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
