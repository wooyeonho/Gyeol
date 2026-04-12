"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { haptic } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";
import type { Quest } from "@/lib/game/quest-system";

interface QuestCardProps {
  quest: Quest;
  onAccept?: (questId: string) => void;
  onClaim?: (questId: string) => void;
  className?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  legendary: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

const TYPE_ICONS: Record<string, string> = {
  chat: "\uD83D\uDCAC",
  care: "\uD83E\uDE79",
  explore: "\uD83E\uDDED",
  social: "\uD83E\uDD1D",
  knowledge: "\uD83D\uDCDA",
  emotional: "\uD83D\uDC9C",
};

export function QuestCard({ quest, onAccept, onClaim, className = "" }: QuestCardProps) {
  const { locale } = useTranslations();
  const isKo = locale === "ko";
  const title = isKo ? quest.title.ko : quest.title.en;
  const desc = isKo ? quest.description.ko : quest.description.en;
  const progress = quest.objective.target > 0
    ? Math.min(quest.objective.current / quest.objective.target, 1)
    : 0;
  const isCompleted = quest.status === "completed";
  const isActive = quest.status === "active";

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={spring.apple}
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-3.5 ${
        isCompleted ? "opacity-60" : ""
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <span className="text-xl mt-0.5">{TYPE_ICONS[quest.type] ?? "\u2753"}</span>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-medium text-white/90 truncate">{title}</h4>
            <span
              className={`flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                DIFFICULTY_COLORS[quest.difficulty] ?? ""
              }`}
            >
              {quest.difficulty}
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed mb-2">{desc}</p>

          {/* Progress bar */}
          <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
            <motion.div
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={spring.silk}
              className={`absolute inset-y-0 left-0 rounded-full ${
                isCompleted
                  ? "bg-emerald-400"
                  : "bg-indigo-500"
              }`}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">
              {quest.objective.current}/{quest.objective.target}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{"\uD83E\uDE99"} {quest.rewards.coins}</span>
              <span>{"\u2728"} {quest.rewards.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex-shrink-0">
          {quest.status === "available" && onAccept && (
            <button
              type="button"
              onClick={() => { haptic("tap"); onAccept(quest.id); }}
              className="rounded-lg bg-indigo-500/20 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30"
            >
              {isKo ? "수락" : "Accept"}
            </button>
          )}
          {isActive && progress >= 1 && onClaim && (
            <button
              type="button"
              onClick={() => { haptic("success"); onClaim(quest.id); }}
              className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
            >
              {isKo ? "보상" : "Claim"}
            </button>
          )}
          {isCompleted && (
            <span className="text-xs text-emerald-400/60">{"\u2714"}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
