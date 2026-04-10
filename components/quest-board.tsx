"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Quest,
  type QuestType,
  type QuestDifficulty,
  getActiveQuests,
  saveQuests,
  completeQuest,
} from "@/lib/game/quest-system";
import { useCelebrationStore } from "@/store/celebration-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_COLORS: Record<QuestDifficulty, string> = {
  easy: "#22c55e",
  medium: "#3b82f6",
  hard: "#a855f7",
  legendary: "#eab308",
};

const DIFFICULTY_LABELS: Record<QuestDifficulty, { ko: string; en: string }> = {
  easy: { ko: "쉬움", en: "Easy" },
  medium: { ko: "보통", en: "Medium" },
  hard: { ko: "어려움", en: "Hard" },
  legendary: { ko: "전설", en: "Legendary" },
};

function getQuestTypeIcon(type: QuestType): string {
  switch (type) {
    case "chat":
      return "\uD83D\uDCAC"; // 💬
    case "care":
      return "\uD83D\uDC96"; // 💖
    case "explore":
      return "\uD83D\uDD2D"; // 🔭
    case "social":
      return "\uD83E\uDD1D"; // 🤝
    case "knowledge":
      return "\uD83D\uDCDA"; // 📚
    case "emotional":
      return "\uD83C\uDF08"; // 🌈
    default:
      return "\u2B50"; // ⭐
  }
}

function getQuestTypeLabel(type: QuestType): { ko: string; en: string } {
  switch (type) {
    case "chat":
      return { ko: "대화", en: "Chat" };
    case "care":
      return { ko: "돌봄", en: "Care" };
    case "explore":
      return { ko: "탐험", en: "Explore" };
    case "social":
      return { ko: "소셜", en: "Social" };
    case "knowledge":
      return { ko: "지식", en: "Knowledge" };
    case "emotional":
      return { ko: "감정", en: "Emotional" };
    default:
      return { ko: "기타", en: "Other" };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

function DifficultyBadge({
  difficulty,
  locale,
}: {
  difficulty: QuestDifficulty;
  locale: string;
}) {
  const color = DIFFICULTY_COLORS[difficulty];
  const isKo = locale.startsWith("ko");
  const label = isKo
    ? DIFFICULTY_LABELS[difficulty].ko
    : DIFFICULTY_LABELS[difficulty].en;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}

function RewardDisplay({ coins, xp, item }: { coins: number; xp: number; item?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-semibold text-amber-400">{coins}c</span>
      <span className="text-white/30">|</span>
      <span className="font-medium text-emerald-400">+{xp}xp</span>
      {item && (
        <>
          <span className="text-white/30">|</span>
          <span className="text-purple-400">{"\uD83C\uDF81"}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claim animation overlay
// ---------------------------------------------------------------------------

function ClaimAnimation({
  rewards,
  onDone,
  locale,
}: {
  rewards: { coins: number; xp: number; item?: string };
  onDone: () => void;
  locale: string;
}) {
  const isKo = locale.startsWith("ko");

  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
      >
        <motion.span
          className="text-5xl"
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
        >
          {"\uD83C\uDF89"}
        </motion.span>
        <p className="text-lg font-bold text-white">
          {isKo ? "퀘스트 완료!" : "Quest Complete!"}
        </p>
        <div className="flex items-center gap-4">
          <motion.div
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-2xl font-bold text-amber-400">+{rewards.coins}</p>
            <p className="text-[10px] text-white/40">{isKo ? "코인" : "Coins"}</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-2xl font-bold text-emerald-400">+{rewards.xp}</p>
            <p className="text-[10px] text-white/40">XP</p>
          </motion.div>
          {rewards.item && (
            <motion.div
              className="text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-2xl">{"\uD83C\uDF81"}</p>
              <p className="text-[10px] text-white/40">{isKo ? "아이템" : "Item"}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quest Card
// ---------------------------------------------------------------------------

function QuestCard({
  quest,
  locale,
  onAccept,
  onClaim,
}: {
  quest: Quest;
  locale: string;
  onAccept: (quest: Quest) => void;
  onClaim: (quest: Quest) => void;
}) {
  const isKo = locale.startsWith("ko");
  const color = DIFFICULTY_COLORS[quest.difficulty];
  const icon = getQuestTypeIcon(quest.type);
  const typeLabel = getQuestTypeLabel(quest.type);
  const progress = quest.objective.current / quest.objective.target;

  return (
    <motion.div
      layout
      className="rounded-2xl border bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
      style={{
        borderColor:
          quest.status === "completed"
            ? `${color}40`
            : quest.status === "expired"
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.08)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: quest.status === "expired" ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white/90">
              {isKo ? quest.title.ko : quest.title.en}
            </p>
            <DifficultyBadge difficulty={quest.difficulty} locale={locale} />
          </div>
          <p className="mt-0.5 text-[11px] text-white/40">
            {isKo ? typeLabel.ko : typeLabel.en}
          </p>
        </div>
        <RewardDisplay
          coins={quest.rewards.coins}
          xp={quest.rewards.xp}
          item={quest.rewards.item}
        />
      </div>

      {/* Description */}
      <p className="mt-2 text-xs leading-relaxed text-white/50">
        {isKo ? quest.description.ko : quest.description.en}
      </p>

      {/* Progress (active/completed only) */}
      {(quest.status === "active" || quest.status === "completed") && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30">
              {quest.objective.current}/{quest.objective.target}
            </span>
            <span className="text-[10px] text-white/30">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <ProgressBar
            current={quest.objective.current}
            target={quest.objective.target}
            color={color}
          />
        </div>
      )}

      {/* Expiry */}
      {quest.expiresAt && quest.status !== "completed" && quest.status !== "expired" && (
        <p className="mt-2 text-[10px] text-white/20">
          {isKo ? "만료:" : "Expires:"}{" "}
          {new Date(quest.expiresAt).toLocaleString(isKo ? "ko-KR" : "en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-3">
        {quest.status === "available" && (
          <button
            type="button"
            onClick={() => onAccept(quest)}
            className="w-full rounded-xl bg-white/10 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/15 active:bg-white/20"
          >
            {isKo ? "수락하기" : "Accept Quest"}
          </button>
        )}

        {quest.status === "completed" && (
          <motion.button
            type="button"
            onClick={() => onClaim(quest)}
            className="w-full rounded-xl py-2 text-xs font-bold text-black transition-colors"
            style={{ backgroundColor: color }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: [
                `0 0 0 0 ${color}00`,
                `0 0 12px 4px ${color}40`,
                `0 0 0 0 ${color}00`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isKo ? "보상 받기" : "Claim Reward"}
          </motion.button>
        )}

        {quest.status === "active" && (
          <div
            className="w-full rounded-xl bg-white/5 py-2 text-center text-xs font-medium text-white/40"
          >
            {isKo ? "진행 중..." : "In Progress..."}
          </div>
        )}

        {quest.status === "expired" && (
          <div className="w-full rounded-xl bg-white/5 py-2 text-center text-xs text-white/20 line-through">
            {isKo ? "만료됨" : "Expired"}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuestBoard (main export)
// ---------------------------------------------------------------------------

export interface QuestBoardProps {
  quests: Quest[];
  locale?: string;
  onQuestsChange?: (quests: Quest[]) => void;
  onRewardClaimed?: (rewards: { coins: number; xp: number; item?: string }) => void;
}

export function QuestBoard({
  quests: initialQuests,
  locale = "en",
  onQuestsChange,
  onRewardClaimed,
}: QuestBoardProps) {
  const isKo = locale.startsWith("ko");
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [claimRewards, setClaimRewards] = useState<{
    coins: number;
    xp: number;
    item?: string;
  } | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setQuests(initialQuests);
  }, [initialQuests]);

  const updateQuests = useCallback(
    (next: Quest[]) => {
      setQuests(next);
      saveQuests(next);
      onQuestsChange?.(next);
    },
    [onQuestsChange],
  );

  const handleAccept = useCallback(
    (quest: Quest) => {
      const next = quests.map((q) =>
        q.id === quest.id ? { ...q, status: "active" as const } : q,
      );
      updateQuests(next);
    },
    [quests, updateQuests],
  );

  const celebrate = useCelebrationStore((s) => s.celebrate);

  const handleClaim = useCallback(
    (quest: Quest) => {
      const rewards = completeQuest(quest);
      if (rewards.coins === 0 && rewards.xp === 0) return;

      setClaimRewards(rewards);
      onRewardClaimed?.(rewards);

      // Trigger global celebration for hard+ quests
      if (quest.difficulty === "hard" || quest.difficulty === "legendary") {
        celebrate({
          title: isKo ? "퀘스트 완료!" : "Quest Complete!",
          subtitle: isKo ? quest.title.ko : quest.title.en,
          reward: { type: "coins", amount: rewards.coins, icon: "🪙" },
          variant: quest.difficulty === "legendary" ? "firework" : "sparkle",
        });
      }

      // Remove claimed quest from list
      const next = quests.filter((q) => q.id !== quest.id);
      updateQuests(next);
    },
    [quests, updateQuests, onRewardClaimed, celebrate, isKo],
  );

  const handleClaimDone = useCallback(() => {
    setClaimRewards(null);
  }, []);

  // Group quests by status for display order
  const completedQuests = quests.filter((q) => q.status === "completed");
  const activeQuests = quests.filter((q) => q.status === "active");
  const availableQuests = quests.filter((q) => q.status === "available");
  const expiredQuests = quests.filter((q) => q.status === "expired");
  const sortedQuests = [
    ...completedQuests,
    ...activeQuests,
    ...availableQuests,
    ...expiredQuests,
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-white/90">
          {isKo ? "퀘스트 보드" : "Quest Board"}
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          {completedQuests.length > 0
            ? isKo
              ? `${completedQuests.length}개 완료!`
              : `${completedQuests.length} done!`
            : isKo
              ? `${activeQuests.length}/${quests.length} 진행 중`
              : `${activeQuests.length}/${quests.length} active`}
        </span>
      </div>

      {/* Quest list */}
      {sortedQuests.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">
            {isKo ? "새로운 퀘스트를 기다리는 중..." : "Waiting for new quests..."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedQuests.map((quest, i) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ delay: i * 0.06 }}
              >
                <QuestCard
                  quest={quest}
                  locale={locale}
                  onAccept={handleAccept}
                  onClaim={handleClaim}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Claim reward overlay */}
      <AnimatePresence>
        {claimRewards && (
          <ClaimAnimation
            rewards={claimRewards}
            onDone={handleClaimDone}
            locale={locale}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
