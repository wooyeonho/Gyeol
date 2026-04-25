"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  getPerfectDayStreak,
  getEarnedPerfectDayMilestones,
  PERFECT_DAY_MILESTONES,
} from "@/lib/engagement/perfect-day";

interface PerfectDayBadgeProps {
  locale?: string;
  compact?: boolean;
}

/**
 * Visual badge showing the user's consecutive perfect-day streak.
 * A "perfect day" = all daily challenges completed in one day.
 * Shows flame icon, count, and Korean/English label.
 */
export function PerfectDayBadge({
  locale = "ko",
  compact = false,
}: PerfectDayBadgeProps) {
  const isKo = locale === "ko" || locale?.startsWith("ko");
  const streak = useMemo(() => getPerfectDayStreak(), []);
  const milestones = useMemo(
    () => getEarnedPerfectDayMilestones(streak.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streak.current],
  );

  // Don't render if no perfect days recorded at all
  if (streak.total === 0) return null;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        title={
          isKo
            ? `${streak.current}일 연속 퍼펙트!`
            : `${streak.current}-day perfect streak!`
        }
      >
        {streak.current > 0 && (
          <motion.span
            className="text-sm"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
          >
            {streak.current >= 7 ? "\uD83D\uDD25" : "\u2B50"}
          </motion.span>
        )}
        <span
          className="text-xs font-medium"
          style={{
            color:
              streak.current >= 14
                ? "#f59e0b"
                : streak.current >= 7
                  ? "#fb923c"
                  : streak.current >= 3
                    ? "#fbbf24"
                    : "rgba(255,255,255,0.5)",
          }}
        >
          {streak.current}
        </span>
        <span className="text-[10px] text-white/40">
          {isKo ? "\uD37C\uD399\uD2B8" : "perfect"}
        </span>
      </motion.div>
    );
  }

  const streakColor =
    streak.current >= 14
      ? "#f59e0b"
      : streak.current >= 7
        ? "#fb923c"
        : streak.current >= 3
          ? "#fbbf24"
          : "rgba(255,255,255,0.4)";

  return (
    <motion.div
      className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-xl"
            animate={
              streak.current >= 3
                ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                : {}
            }
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 4 }}
          >
            {streak.current >= 7 ? "\uD83D\uDD25" : "\u2B50"}
          </motion.span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300/70">
              {isKo ? "\uD37C\uD399\uD2B8 \uB370\uC774" : "Perfect Day"}
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <motion.span
                className="text-xl font-semibold"
                style={{ color: streakColor }}
                key={streak.current}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {streak.current}
              </motion.span>
              <span className="text-sm text-white/60">
                {isKo
                  ? `\uC77C \uC5F0\uC18D \uD37C\uD399\uD2B8!`
                  : `day${streak.current !== 1 ? "s" : ""} perfect streak!`}
              </span>
            </div>
          </div>
        </div>
        {streak.longest > 0 && streak.longest > streak.current && (
          <div className="text-right">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              {isKo ? "\uCD5C\uACE0" : "Best"}
            </p>
            <p className="text-sm font-medium text-white/50">
              {streak.longest}
            </p>
          </div>
        )}
      </div>

      {/* Milestone badges */}
      <div className="mt-3 flex gap-2">
        {PERFECT_DAY_MILESTONES.map((m) => {
          const earned = milestones.includes(m);
          return (
            <span
              key={m}
              className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                earned
                  ? "border-amber-300/45 bg-amber-400/16 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-white/25"
              }`}
            >
              {m}
              {isKo ? "\uC77C" : "d"}
            </span>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="mt-2 flex gap-4 text-[11px] text-white/35">
        <span>
          {isKo ? "\uCD1D" : "Total"}: {streak.total}
          {isKo ? "\uC77C" : " days"}
        </span>
        <span>
          {isKo ? "\uCD5C\uACE0 \uC5F0\uC18D" : "Best"}: {streak.longest}
          {isKo ? "\uC77C" : " days"}
        </span>
      </div>
    </motion.div>
  );
}
