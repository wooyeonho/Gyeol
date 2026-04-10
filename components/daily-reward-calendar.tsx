"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

interface DailyReward {
  day: number;
  icon: string;
  label: string;
  amount: number;
  claimed: boolean;
  isToday: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface DailyRewardCalendarProps {
  streakDays: number;
  currentDay: number; // day of month (1-31)
  claimedDays: number[];
  onClaim?: (day: number) => void;
}

const RARITY_GLOW: Record<string, string> = {
  common: "rgba(148,163,184,0.3)",
  rare: "rgba(59,130,246,0.4)",
  epic: "rgba(168,85,247,0.5)",
  legendary: "rgba(245,158,11,0.6)",
};

const RARITY_BORDER: Record<string, string> = {
  common: "rgba(148,163,184,0.2)",
  rare: "rgba(59,130,246,0.3)",
  epic: "rgba(168,85,247,0.4)",
  legendary: "rgba(245,158,11,0.5)",
};

/** Generate 7-day rolling reward schedule */
function generateRewards(startDay: number, streakDays: number): DailyReward[] {
  const rewards: DailyReward[] = [];
  const rewardPool = [
    { icon: "🪙", label: "코인", amount: 50, rarity: "common" as const },
    { icon: "🪙", label: "코인", amount: 75, rarity: "common" as const },
    { icon: "✨", label: "먼지", amount: 10, rarity: "common" as const },
    { icon: "🧬", label: "진화 포인트", amount: 5, rarity: "rare" as const },
    { icon: "🪙", label: "코인", amount: 150, rarity: "rare" as const },
    { icon: "❄️", label: "스트릭 프리즈", amount: 1, rarity: "epic" as const },
    { icon: "🎁", label: "미스터리 박스", amount: 1, rarity: "legendary" as const },
  ];

  for (let i = 0; i < 7; i++) {
    const day = startDay + i;
    const reward = rewardPool[i % rewardPool.length];
    // Day 7 is always legendary
    const actualReward = i === 6 ? rewardPool[6] : reward;
    // Streak bonus: multiply amounts
    const streakMultiplier = streakDays >= 7 ? 2 : streakDays >= 3 ? 1.5 : 1;

    rewards.push({
      day,
      icon: actualReward.icon,
      label: actualReward.label,
      amount: Math.round(actualReward.amount * streakMultiplier),
      claimed: false,
      isToday: i === 0,
      rarity: actualReward.rarity,
    });
  }

  return rewards;
}

/**
 * Gacha/Genshin-style daily login reward calendar.
 * Shows 7 days of rewards with streak multiplier.
 */
export function DailyRewardCalendar({
  streakDays,
  currentDay,
  claimedDays,
  onClaim,
}: DailyRewardCalendarProps) {
  const { t } = useTranslations();

  const rewards = useMemo(
    () => generateRewards(currentDay, streakDays).map((r) => ({
      ...r,
      claimed: claimedDays.includes(r.day),
    })),
    [currentDay, streakDays, claimedDays],
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">
          {t("rewards.dailyCalendar") || "일일 보상"}
        </h3>
        {streakDays >= 3 && (
          <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            x{streakDays >= 7 ? "2.0" : "1.5"} 스트릭 보너스
          </span>
        )}
      </div>

      {/* Reward grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {rewards.map((reward, i) => {
          const canClaim = reward.isToday && !reward.claimed;

          return (
            <motion.button
              key={reward.day}
              type="button"
              disabled={!canClaim}
              onClick={() => canClaim && onClaim?.(reward.day)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={canClaim ? { scale: 0.9 } : undefined}
              className="relative flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all"
              style={{
                background: reward.claimed
                  ? "rgba(255,255,255,0.03)"
                  : canClaim
                    ? `${RARITY_GLOW[reward.rarity]}`
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${canClaim ? RARITY_BORDER[reward.rarity] : reward.claimed ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
                opacity: reward.claimed ? 0.5 : 1,
              }}
            >
              {/* Day label */}
              <span className="text-[8px] text-white/30 tabular-nums">
                Day {i + 1}
              </span>

              {/* Reward icon */}
              <span className={`text-lg ${reward.claimed ? "grayscale" : ""}`}>
                {reward.claimed ? "✓" : reward.icon}
              </span>

              {/* Amount */}
              <span className="text-[9px] font-medium text-white/50 tabular-nums">
                x{reward.amount}
              </span>

              {/* Today indicator */}
              {reward.isToday && !reward.claimed && (
                <motion.div
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Legendary glow */}
              {reward.rarity === "legendary" && !reward.claimed && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ border: "1px solid rgba(245,158,11,0.4)" }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
