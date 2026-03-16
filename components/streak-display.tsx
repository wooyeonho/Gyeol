"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getNextMilestone } from "@/lib/rewards/streak-milestones";

type StreakDisplayProps = {
  days: number;
  todayActive: boolean;
  weeklyActivity?: boolean[];
  locale?: string;
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
  const nextMilestone = getNextMilestone(days);

  const streakColor = days >= 30
    ? "#f59e0b"
    : days >= 7
      ? "#fb923c"
      : days >= 3
        ? "#fbbf24"
        : "#ffffff40";

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/65">
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
            <span className="text-xs text-white/65">{streakLabel}</span>
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

      {/* Next milestone countdown */}
      {nextMilestone && days > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: streakColor }}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, (days / nextMilestone.days) * 100)}%`,
              }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-[10px] text-white/45 whitespace-nowrap">
            {nextMilestone.badge[locale] ?? nextMilestone.badge.en}
            {" "}
            {locale === "ko"
              ? `${nextMilestone.days - days}일 남음`
              : `${nextMilestone.days - days}d left`}
          </span>
        </div>
      )}

      {/* Weekly activity heatmap */}
      <div className="mt-3 flex gap-1">
          {weeklyActivity.map((active, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayIndex = d.getDay();
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
              <span className="text-[10px] text-white/45">{dayLabel}</span>
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
    </motion.div>
  );
}
