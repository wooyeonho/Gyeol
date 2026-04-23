"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCurrentSeason,
  getSeasonProgress,
  claimSeasonReward,
  getSeasonTimeRemaining,
  type Season,
  type SeasonProgress,
  type SeasonReward,
} from "@/lib/game/season-system";

// ── Reward icon mapping ──────────────────────────────────────────────────────

const REWARD_ICONS: Record<string, string> = {
  coins: "🪙",
  "xp-boost": "⚡",
  "avatar-frame": "🖼️",
  "emoji-pack": "😊",
  title: "🏷️",
  skin: "🎨",
  background: "🌅",
  "legendary-skin": "✨",
};

function getRewardIcon(type: string): string {
  return REWARD_ICONS[type] ?? "🎁";
}

// ── Timer hook ───────────────────────────────────────────────────────────────

function useSeasonTimer() {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0 });

  useEffect(() => {
    const update = () => setRemaining(getSeasonTimeRemaining());
    update();
    const interval = setInterval(update, 60_000); // every minute
    return () => clearInterval(interval);
  }, []);

  return remaining;
}

// ── Tier Cell ────────────────────────────────────────────────────────────────

interface TierCellProps {
  reward: SeasonReward;
  progress: SeasonProgress;
  isPremiumRow: boolean;
  onClaim: (tier: number) => void;
}

function TierCell({ reward, progress, isPremiumRow, onClaim }: TierCellProps) {
  const isReached = progress.currentTier >= reward.tier;
  const isClaimed = progress.claimedTiers.includes(reward.tier);
  const isCurrent = progress.currentTier === reward.tier;
  const isLocked = isPremiumRow && !progress.isPremium;

  const rewardData = isPremiumRow ? reward.premiumReward : reward.freeReward;
  if (!rewardData) return <div className="h-20 w-20 shrink-0" />;

  const canClaim = isReached && !isClaimed && !isLocked;

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isCurrent ? 1.05 : 1,
        borderColor: isCurrent
          ? "rgb(168, 85, 247)"
          : isReached
            ? "rgb(34, 197, 94)"
            : "rgb(55, 65, 81)",
      }}
      className={`
        relative flex h-20 w-20 shrink-0 flex-col items-center justify-center
        rounded-xl border-2 transition-colors
        ${isReached ? "bg-gray-800" : "bg-gray-900"}
        ${isLocked ? "opacity-40 blur-[1px]" : ""}
      `}
    >
      {/* Tier number */}
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gray-700 px-1.5 text-[10px] font-bold text-gray-300">
        {reward.tier}
      </span>

      {/* Reward icon */}
      <span className="text-2xl">{getRewardIcon(rewardData.type)}</span>

      {/* Status overlay */}
      {isClaimed && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/20"
        >
          <span className="text-xl text-green-400">&#10003;</span>
        </motion.div>
      )}

      {/* Claim button */}
      {canClaim && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onClaim(reward.tier)}
          className="absolute -bottom-3 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg hover:bg-purple-500"
        >
          Claim
        </motion.button>
      )}

      {/* Lock icon for premium */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg">🔒</span>
        </div>
      )}
    </motion.div>
  );
}

// ── XP Progress connector between tiers ──────────────────────────────────────

function XpConnector({
  fromTier,
  toTier,
  season,
  progress,
}: {
  fromTier: number;
  toTier: number;
  season: Season;
  progress: SeasonProgress;
}) {
  const fromXp = fromTier === 0 ? 0 : season.rewards[fromTier - 1].xpRequired;
  const toXp = season.rewards[toTier - 1].xpRequired;
  const range = toXp - fromXp;
  const filled = Math.min(1, Math.max(0, (progress.currentXp - fromXp) / range));

  return (
    <div className="flex h-1 w-4 shrink-0 items-center self-center">
      <div className="h-full w-full overflow-hidden rounded-full bg-gray-700">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${filled * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full rounded-full bg-purple-500"
        />
      </div>
    </div>
  );
}

// ── Main BattlePass Component ────────────────────────────────────────────────

export default function BattlePass() {
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<SeasonProgress | null>(null);
  const [claimedAnimation, setClaimedAnimation] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timer = useSeasonTimer();

  // Load season data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeason(getCurrentSeason());
    setProgress(getSeasonProgress());
  }, []);

  // Scroll to current tier on mount
  useEffect(() => {
    if (scrollRef.current && progress) {
      const tierIndex = Math.max(0, progress.currentTier - 3);
      const scrollTarget = tierIndex * (80 + 16); // tier width + gap
      scrollRef.current.scrollTo({ left: scrollTarget, behavior: "smooth" });
    }
  }, [progress?.currentTier]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClaim = useCallback(
    (tier: number) => {
      try {
        const { newProgress } = claimSeasonReward(tier);
        setProgress({ ...newProgress });
        setClaimedAnimation(tier);
        setTimeout(() => setClaimedAnimation(null), 1500);
      } catch {
        // Already claimed or not reached — ignore
      }
    },
    [],
  );

  // XP progress to next tier
  const nextTierProgress = useMemo(() => {
    if (!season || !progress) return 0;
    if (progress.currentTier >= 50) return 1;

    const currentTierXp =
      progress.currentTier === 0
        ? 0
        : season.rewards[progress.currentTier - 1].xpRequired;
    const nextTierXp = season.rewards[progress.currentTier].xpRequired;
    const range = nextTierXp - currentTierXp;

    return range > 0 ? (progress.currentXp - currentTierXp) / range : 0;
  }, [season, progress]);

  if (!season || !progress) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading season data...
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {season.name.ko}{" "}
            <span className="text-sm font-normal text-gray-400">
              {season.name.en}
            </span>
          </h2>
          <p className="text-xs text-gray-500">
            Tier {progress.currentTier} / 50
            {progress.isPremium && (
              <span className="ml-2 rounded bg-purple-600/30 px-1.5 py-0.5 text-purple-300">
                PREMIUM
              </span>
            )}
          </p>
        </div>

        {/* Season timer */}
        <div className="text-right">
          <div className="text-xs text-gray-500">Season ends in</div>
          <div className="text-sm font-bold text-white">
            {timer.days}d {timer.hours}h
          </div>
        </div>
      </div>

      {/* Overall XP progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-[10px] text-gray-500">
          <span>{progress.currentXp.toLocaleString()} XP</span>
          <span>
            {progress.currentTier < 50
              ? `${season.rewards[progress.currentTier].xpRequired.toLocaleString()} XP`
              : "MAX"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, nextTierProgress) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
          />
        </div>
      </div>

      {/* Tier tracks */}
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent overflow-x-auto pb-4"
      >
        {/* Free track label */}
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Free Track
        </div>

        {/* Free rewards row */}
        <div className="mb-2 flex items-center gap-1">
          {season.rewards.map((reward, idx) => (
            <div key={`free-${reward.tier}`} className="flex items-center">
              <TierCell
                reward={reward}
                progress={progress}
                isPremiumRow={false}
                onClaim={handleClaim}
              />
              {idx < season.rewards.length - 1 && (
                <XpConnector
                  fromTier={reward.tier}
                  toTier={season.rewards[idx + 1].tier}
                  season={season}
                  progress={progress}
                />
              )}
            </div>
          ))}
        </div>

        {/* Premium track label */}
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
          Premium Track {!progress.isPremium && "🔒"}
        </div>

        {/* Premium rewards row */}
        <div className="flex items-center gap-1">
          {season.rewards.map((reward, idx) => (
            <div key={`premium-${reward.tier}`} className="flex items-center">
              <TierCell
                reward={reward}
                progress={progress}
                isPremiumRow={true}
                onClaim={handleClaim}
              />
              {idx < season.rewards.length - 1 && (
                <XpConnector
                  fromTier={reward.tier}
                  toTier={season.rewards[idx + 1].tier}
                  season={season}
                  progress={progress}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Claim animation overlay */}
      <AnimatePresence>
        {claimedAnimation !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl bg-purple-600/90 px-8 py-4 text-center shadow-2xl">
              <div className="text-3xl">🎉</div>
              <div className="mt-1 text-sm font-bold text-white">
                Tier {claimedAnimation} Claimed!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
