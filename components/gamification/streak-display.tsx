"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { useTranslations } from "@/components/i18n-provider";

export interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  shieldCount?: number;
  className?: string;
}

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

function getFlameEmoji(streak: number): string {
  if (streak >= 365) return "\uD83C\uDF1F";
  if (streak >= 100) return "\uD83D\uDCAB";
  if (streak >= 30) return "\uD83C\uDF0B";
  if (streak >= 7) return "\uD83D\uDD25";
  if (streak >= 3) return "\u2728";
  return "\uD83D\uDCA4";
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  level,
  totalXp,
  xpIntoLevel,
  xpForNext,
  shieldCount = 0,
  className = "",
}: StreakDisplayProps) {
  const { locale } = useTranslations();
  const progress = xpForNext > 0 ? Math.min(xpIntoLevel / xpForNext, 1) : 0;
  const flame = getFlameEmoji(currentStreak);
  const nextMilestone = MILESTONES.find((m) => m > currentStreak) ?? currentStreak + 1;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      {/* Streak header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            key={currentStreak}
            initial={{ scale: 0.5, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.wobble}
            className="text-2xl"
          >
            {flame}
          </motion.span>
          <div>
            <p className="text-lg font-bold text-white/90 leading-none">
              {currentStreak}
              <span className="text-xs font-normal text-white/40 ml-1">
                {locale === "ko" ? "일 연속" : "day streak"}
              </span>
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {locale === "ko" ? `최고 ${longestStreak}일` : `Best: ${longestStreak}d`}
              {shieldCount > 0 && (
                <span className="ml-1.5">
                  {"\uD83D\uDEE1\uFE0F"} {shieldCount}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Level badge */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-indigo-400">
            Lv.{level}
          </span>
          <span className="text-[10px] text-white/30">
            {totalXp.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={spring.silk}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/30">
        <span>{xpIntoLevel} / {xpForNext} XP</span>
        <span>
          {locale === "ko"
            ? `다음 마일스톤: ${nextMilestone}일`
            : `Next: ${nextMilestone}d`}
        </span>
      </div>

      {/* Milestone dots */}
      <div className="flex gap-1 mt-3 justify-center">
        {MILESTONES.slice(0, 6).map((m) => (
          <div
            key={m}
            className={`w-2 h-2 rounded-full transition-colors ${
              currentStreak >= m
                ? "bg-indigo-400"
                : "bg-white/[0.08]"
            }`}
            title={`${m}d`}
          />
        ))}
      </div>
    </div>
  );
}
