"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { haptic } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";
import type {
  AchievementDefinition,
  AchievementRarity,
} from "@/lib/engagement/achievements";
import type { Locale } from "@/lib/i18n/config";

interface AchievementCardProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  progress?: { current: number; target: number };
  onShare?: (achievementId: string) => void;
  className?: string;
}

const RARITY_STYLES: Record<AchievementRarity, { border: string; glow: string; label: string }> = {
  common: {
    border: "border-white/10",
    glow: "",
    label: "text-white/40",
  },
  rare: {
    border: "border-sky-500/30",
    glow: "shadow-sky-500/5",
    label: "text-sky-400",
  },
  epic: {
    border: "border-violet-500/30",
    glow: "shadow-violet-500/10",
    label: "text-violet-400",
  },
  legendary: {
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10 shadow-lg",
    label: "text-amber-400",
  },
  mythic: {
    border: "border-rose-500/30",
    glow: "shadow-rose-500/15 shadow-xl",
    label: "text-rose-400",
  },
};

const RARITY_LABELS: Record<AchievementRarity, { ko: string; en: string }> = {
  common: { ko: "일반", en: "Common" },
  rare: { ko: "레어", en: "Rare" },
  epic: { ko: "에픽", en: "Epic" },
  legendary: { ko: "전설", en: "Legendary" },
  mythic: { ko: "신화", en: "Mythic" },
};

export function AchievementCard({
  achievement,
  unlocked,
  progress,
  onShare,
  className = "",
}: AchievementCardProps) {
  const { locale } = useTranslations();
  const loc = locale as Locale;
  const style = RARITY_STYLES[achievement.rarity];
  const label = achievement.label[loc] ?? achievement.label.en;
  const desc = achievement.description[loc] ?? achievement.description.en;
  const rarityLabel = RARITY_LABELS[achievement.rarity];
  const progressPct =
    progress && progress.target > 0
      ? Math.min(progress.current / progress.target, 1)
      : unlocked
        ? 1
        : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={spring.pop}
      className={`relative rounded-xl border ${style.border} ${style.glow} bg-white/[0.03] p-3.5 ${
        !unlocked ? "opacity-50 grayscale" : ""
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <motion.span
          className="text-2xl"
          animate={unlocked ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {achievement.hidden && !unlocked ? "\u2753" : achievement.icon}
        </motion.span>

        <div className="flex-1 min-w-0">
          {/* Title + rarity */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-medium text-white/90 truncate">
              {achievement.hidden && !unlocked
                ? locale === "ko" ? "???" : "???"
                : label}
            </h4>
            <span className={`text-[10px] font-medium ${style.label}`}>
              {locale === "ko" ? rarityLabel.ko : rarityLabel.en}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-white/50 leading-relaxed mb-2">
            {achievement.hidden && !unlocked
              ? locale === "ko" ? "숨겨진 업적" : "Hidden achievement"
              : desc}
          </p>

          {/* Progress bar */}
          {progress && !unlocked && (
            <>
              <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPct * 100}%` }}
                  transition={spring.silk}
                  className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                />
              </div>
              <span className="text-[10px] text-white/30">
                {progress.current}/{progress.target}
              </span>
            </>
          )}

          {/* Reward preview */}
          {unlocked && achievement.reward && (
            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
              {achievement.reward.coins && (
                <span>{"\uD83E\uDE99"} {achievement.reward.coins}</span>
              )}
              {achievement.reward.evolution_points && (
                <span>{"\uD83E\uDDEC"} {achievement.reward.evolution_points}</span>
              )}
              {achievement.reward.exclusive_title && (
                <span className="text-amber-400/70">
                  {"\uD83C\uDFC6"} {achievement.reward.exclusive_title}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Share button */}
        {unlocked && onShare && (
          <button
            type="button"
            onClick={() => { haptic("tap"); onShare(achievement.id); }}
            className="flex-shrink-0 rounded-lg bg-white/[0.06] p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.12]"
            aria-label="Share"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
