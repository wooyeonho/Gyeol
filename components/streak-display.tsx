"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100] as const;

type StreakDisplayProps = {
  days: number;
  todayActive: boolean;
  weeklyActivity?: boolean[];
  locale?: "ko" | "en";
  compact?: boolean;
};

export function StreakDisplay({
  days,
  todayActive,
  weeklyActivity = [false, false, false, false, false, false, false],
  locale = "ko",
  compact = false,
}: StreakDisplayProps) {
  // Derive celebration state purely from props — no effects needed
  const isMilestone = days > 0 && days % 7 === 0;
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const showCelebration = isMilestone && !celebrationDismissed;
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > days) ?? null;
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = (midnight.getTime() - now.getTime()) / 3600000;
  const showRiskTimer = days > 0 && !todayActive && hoursUntilMidnight <= 4;
  const countdownLabel = (() => {
    const totalMinutes = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return locale === "ko"
      ? `${hours}시간 ${minutes}분`
      : `${hours}h ${minutes}m`;
  })();

  const streakColor = days >= 30
    ? "#f59e0b" // amber for 30+
    : days >= 7
      ? "#fb923c" // orange for 7+
      : days >= 3
        ? "#fbbf24" // yellow for 3+
        : "#ffffff40"; // dim for 0-2

  const streakLabel = days === 0
    ? (locale === "ko" ? "오늘 첫 대화를 시작해보세요" : "Start your first conversation today")
    : locale === "ko"
      ? `${days}일 연속`
      : `${days} day streak`;

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
            {locale === "ko" ? "연속 대화" : "Streak"}
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
            {locale === "ko" ? "다음 마일스톤" : "Next milestone"}
          </p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white/85">
            {nextMilestone
              ? locale === "ko"
                ? `${nextMilestone - days}일 남음`
                : `${nextMilestone - days} days left`
              : locale === "ko"
                ? "최고 구간"
                : "Peak tier"}
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

      {/* Weekly activity heatmap */}
      <div className="mt-4 flex gap-1">
          {weeklyActivity.map((active, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayIndex = d.getDay(); // 0=Sun, 1=Mon, ...
            const koLabels = ["일", "월", "화", "수", "목", "금", "토"];
            const enLabels = ["S", "M", "T", "W", "T", "F", "S"];
            const dayLabel = locale === "ko" ? koLabels[dayIndex] : enLabels[dayIndex];
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

      {/* Streak break warning */}
      {days > 0 && !todayActive && (
        <motion.div
          className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-amber-200/80">
            {locale === "ko"
              ? `⚠️ 오늘 대화하지 않으면 ${days}일 연속 기록이 끊어집니다!`
              : `⚠️ Talk today to keep your ${days}-day streak alive!`}
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
            {locale === "ko"
              ? `스트릭 위험! 자정까지 ${countdownLabel} 남았습니다.`
              : `Streak danger! ${countdownLabel} until midnight.`}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
