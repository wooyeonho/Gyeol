"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DayReward {
  day: number;
  icon: string;
  label: { ko: string; en: string };
  type: "coins" | "xp" | "streak_shield" | "item";
  amount: number;
}

const WEEKLY_REWARDS: DayReward[] = [
  { day: 1, icon: "🪙", label: { ko: "코인 10개", en: "10 Coins" }, type: "coins", amount: 10 },
  { day: 2, icon: "⭐", label: { ko: "경험치 50", en: "50 XP" }, type: "xp", amount: 50 },
  { day: 3, icon: "🪙", label: { ko: "코인 20개", en: "20 Coins" }, type: "coins", amount: 20 },
  { day: 4, icon: "🛡️", label: { ko: "스트릭 쉴드", en: "Streak Shield" }, type: "streak_shield", amount: 1 },
  { day: 5, icon: "🪙", label: { ko: "코인 30개", en: "30 Coins" }, type: "coins", amount: 30 },
  { day: 6, icon: "⭐", label: { ko: "경험치 150", en: "150 XP" }, type: "xp", amount: 150 },
  { day: 7, icon: "💎", label: { ko: "코인 100개", en: "100 Coins" }, type: "coins", amount: 100 },
];

interface DailyLoginBonusProps {
  /** Day index 1-7 that user is on in the cycle */
  currentDayIndex: number;
  /** Whether today's bonus has already been claimed */
  alreadyClaimed: boolean;
  onClaim: () => Promise<void>;
  locale?: string;
}

export function DailyLoginBonus({
  currentDayIndex,
  alreadyClaimed,
  onClaim,
  locale = "ko",
}: DailyLoginBonusProps) {
  const [claiming, setClaiming] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const isKo = locale === "ko";

  const todayReward = WEEKLY_REWARDS[(currentDayIndex - 1) % 7];

  const handleClaim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);
    try {
      await onClaim();
      setShowReveal(true);
      setClaimed(true);
      setTimeout(() => setShowReveal(false), 2500);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="glass-card-strong rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {isKo ? "출석 보상" : "Daily Login Bonus"}
        </h3>
        <span className="text-[10px] text-white/40">
          {isKo ? `${currentDayIndex}일차` : `Day ${currentDayIndex}`}
        </span>
      </div>

      {/* 7-day calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {WEEKLY_REWARDS.map((reward, i) => {
          const dayNum = i + 1;
          const isPast = dayNum < currentDayIndex;
          const isToday = dayNum === currentDayIndex;
          const isFuture = dayNum > currentDayIndex;

          return (
            <div
              key={dayNum}
              className={`flex flex-col items-center rounded-lg p-1.5 border transition-all ${
                isPast
                  ? "border-white/5 bg-white/[0.02] opacity-50"
                  : isToday
                  ? "border-amber-400/50 bg-amber-400/10"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <span className={`text-base ${isFuture ? "opacity-40" : ""}`}>
                {isPast ? "✅" : reward.icon}
              </span>
              <span className={`text-[9px] mt-0.5 ${isToday ? "text-amber-400 font-bold" : "text-white/30"}`}>
                {isKo ? `${dayNum}일` : `D${dayNum}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Today's reward highlight */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
        <span className="text-2xl">{todayReward.icon}</span>
        <div>
          <p className="text-xs font-semibold text-amber-300">
            {isKo ? "오늘의 보상" : "Today's Reward"}
          </p>
          <p className="text-[11px] text-white/60">
            {todayReward.label[locale === "ko" ? "ko" : "en"]}
          </p>
        </div>
      </div>

      {/* Claim button */}
      <motion.button
        className={`btn-3d w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
          claimed
            ? "bg-white/5 text-white/30 cursor-not-allowed"
            : "bg-amber-500 text-white hover:bg-amber-400 active:scale-95"
        }`}
        onClick={handleClaim}
        disabled={claimed || claiming}
        whileTap={claimed ? undefined : { scale: 0.97 }}
      >
        {claiming
          ? (isKo ? "수령 중..." : "Claiming...")
          : claimed
          ? (isKo ? "오늘 수령 완료 ✓" : "Claimed today ✓")
          : (isKo ? "보상 받기" : "Claim Reward")}
      </motion.button>

      {/* Reveal animation */}
      <AnimatePresence>
        {showReveal && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-black/80 px-8 py-6 backdrop-blur-sm">
              <span className="text-5xl">{todayReward.icon}</span>
              <span className="text-lg font-bold text-amber-400">
                {todayReward.label[isKo ? "ko" : "en"]}
              </span>
              <span className="text-xs text-white/60">
                {isKo ? "획득!" : "Obtained!"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
