"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateDailyQuests, type Quest } from "@/lib/creature/quests";
import type { CreatureDNA } from "@/lib/genome/dna";

interface DailySpecialChallengeProps {
  dna: CreatureDNA;
  genLevel: number;
  locale?: string;
  onAccept?: (quest: Quest) => void;
}

/**
 * Wordle-style daily special challenge — one per day, resets at midnight.
 * Shows 3 quests of varying difficulty.
 */
export function DailySpecialChallenge({
  dna,
  genLevel,
  locale = "en",
  onAccept,
}: DailySpecialChallengeProps) {
  const isKo = locale?.startsWith("ko");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Seed by date for consistent daily quests
  const todaySeed = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }, []);

  const quests = useMemo(
    () => generateDailyQuests(dna, genLevel, todaySeed),
    [dna, genLevel, todaySeed],
  );

  const difficultyColors: Record<string, string> = {
    easy: "#22c55e",
    medium: "#3b82f6",
    hard: "#a855f7",
    legendary: "#f59e0b",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          {isKo ? "오늘의 퀘스트" : "Daily Quests"}
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          {new Date().toLocaleDateString(isKo ? "ko-KR" : "en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {quests.map((quest) => (
        <motion.div
          key={quest.id}
          className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 cursor-pointer"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setExpandedId(expandedId === quest.id ? null : quest.id)}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">{getQuestTypeIcon(quest.type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white/80">
                  {isKo ? quest.title.ko : quest.title.en}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    color: difficultyColors[quest.difficulty],
                    backgroundColor: `${difficultyColors[quest.difficulty]}15`,
                  }}
                >
                  {quest.difficulty}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                {isKo ? quest.description.ko : quest.description.en}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-amber-400">{quest.rewardCoins}c</p>
              <p className="text-[10px] text-white/30">+{quest.rewardEvo}evo</p>
            </div>
          </div>

          <AnimatePresence>
            {expandedId === quest.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-white/50 italic">
                    {isKo ? quest.hint.ko : quest.hint.en}
                  </p>
                  {quest.timeLimitHours > 0 && (
                    <p className="mt-1 text-[10px] text-white/30">
                      {isKo ? `제한 시간: ${quest.timeLimitHours}시간` : `Time limit: ${quest.timeLimitHours}h`}
                    </p>
                  )}
                  {onAccept && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(quest);
                      }}
                      className="mt-3 w-full rounded-xl bg-white/10 py-2 text-xs font-medium text-white/80 hover:bg-white/15 transition-colors"
                    >
                      {isKo ? "수락" : "Accept Quest"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function getQuestTypeIcon(type: string): string {
  switch (type) {
    case "knowledge": return "📚";
    case "emotional": return "💝";
    case "social": return "🤝";
    case "discovery": return "🔍";
    default: return "⭐";
  }
}
