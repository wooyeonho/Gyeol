"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ACHIEVEMENTS,
  getVisibleAchievements,
  computeAchievementProgress,
  type AchievementDefinition,
  type AchievementCategory,
  type UnlockedAchievement,
} from "@/lib/engagement/achievements";
import { getPerfectDayStreak } from "@/lib/engagement/perfect-day";
import type { Locale } from "@/lib/i18n/config";

// ── Display category mapping ──
// Maps internal categories to the Korean-labeled showcase categories
type ShowcaseCategory = "all" | "chat" | "growth" | "social" | "explore" | "special";

const SHOWCASE_CATEGORIES: {
  key: ShowcaseCategory;
  label: { ko: string; en: string };
  icon: string;
  internalCategories: AchievementCategory[];
}[] = [
  {
    key: "all",
    label: { ko: "전체", en: "All" },
    icon: "🏆",
    internalCategories: [],
  },
  {
    key: "chat",
    label: { ko: "대화", en: "Chat" },
    icon: "💬",
    internalCategories: ["conversation"],
  },
  {
    key: "growth",
    label: { ko: "성장", en: "Growth" },
    icon: "🌱",
    internalCategories: ["streak", "evolution"],
  },
  {
    key: "social",
    label: { ko: "소셜", en: "Social" },
    icon: "🤝",
    internalCategories: ["social"],
  },
  {
    key: "explore",
    label: { ko: "탐험", en: "Explore" },
    icon: "🧭",
    internalCategories: ["exploration"],
  },
  {
    key: "special",
    label: { ko: "특별", en: "Special" },
    icon: "⭐",
    internalCategories: ["emotional", "secret"],
  },
];

const RARITY_COLORS: Record<string, { border: string; bg: string; glow: string; text: string }> = {
  common: {
    border: "border-white/20",
    bg: "bg-white/[0.06]",
    glow: "",
    text: "text-white/60",
  },
  rare: {
    border: "border-blue-400/30",
    bg: "bg-blue-500/[0.08]",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
    text: "text-blue-300",
  },
  epic: {
    border: "border-purple-400/30",
    bg: "bg-purple-500/[0.08]",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.12)]",
    text: "text-purple-300",
  },
  legendary: {
    border: "border-amber-400/40",
    bg: "bg-amber-500/[0.1]",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    text: "text-amber-300",
  },
  mythic: {
    border: "border-rose-400/40",
    bg: "bg-gradient-to-br from-rose-500/[0.12] to-amber-500/[0.08]",
    glow: "shadow-[0_0_40px_rgba(244,63,94,0.15)]",
    text: "text-rose-300",
  },
};

const LOCKED_STYLE = {
  border: "border-white/8",
  bg: "bg-white/[0.02]",
  glow: "",
  text: "text-white/25",
};

interface AchievementShowcaseProps {
  unlockedAchievements: UnlockedAchievement[];
  stats?: Record<string, number>;
  locale?: Locale;
}

function formatDate(isoString: string, locale: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(locale === "ko" ? "ko-KR" : locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString.slice(0, 10);
  }
}

function getLocalizedText(
  field: { ko: string; en: string; ja?: string; zh?: string; es?: string },
  locale: string,
): string {
  const l = locale as keyof typeof field;
  return (field[l] as string | undefined) ?? field.en;
}

function buildShareText(
  achievement: AchievementDefinition,
  locale: string,
): string {
  const name = getLocalizedText(achievement.label, locale);
  const desc = getLocalizedText(achievement.description, locale);
  const rarityLabel = achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1);
  return locale === "ko"
    ? `${achievement.icon} [${rarityLabel}] ${name}\n${desc}\n#Gyeol #업적`
    : `${achievement.icon} [${rarityLabel}] ${name}\n${desc}\n#Gyeol #Achievement`;
}

export function AchievementShowcase({
  unlockedAchievements,
  stats = {},
  locale = "ko",
}: AchievementShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategory>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const unlockedSet = useMemo(
    () => new Set(unlockedAchievements.map((u) => u.achievement_id)),
    [unlockedAchievements],
  );

  const unlockedMap = useMemo(() => {
    const map = new Map<string, UnlockedAchievement>();
    for (const u of unlockedAchievements) {
      map.set(u.achievement_id, u);
    }
    return map;
  }, [unlockedAchievements]);

  // Merge perfect day streak into stats for progress computation
  const enrichedStats = useMemo(() => {
    const perfectDay = getPerfectDayStreak();
    return {
      ...stats,
      perfect_day_streak: stats.perfect_day_streak ?? perfectDay.current,
    };
  }, [stats]);

  const visibleAchievements = useMemo(
    () => getVisibleAchievements([...unlockedSet]),
    [unlockedSet],
  );

  const filteredAchievements = useMemo(() => {
    if (activeCategory === "all") return visibleAchievements;
    const catDef = SHOWCASE_CATEGORIES.find((c) => c.key === activeCategory);
    if (!catDef) return visibleAchievements;
    return visibleAchievements.filter((a) =>
      catDef.internalCategories.includes(a.category),
    );
  }, [visibleAchievements, activeCategory]);

  // Sort: unlocked first (by date desc), then locked
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      const aUnlocked = unlockedSet.has(a.id);
      const bUnlocked = unlockedSet.has(b.id);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      if (aUnlocked && bUnlocked) {
        const aDate = unlockedMap.get(a.id)?.unlocked_at ?? "";
        const bDate = unlockedMap.get(b.id)?.unlocked_at ?? "";
        return bDate.localeCompare(aDate);
      }
      return 0;
    });
  }, [filteredAchievements, unlockedSet, unlockedMap]);

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;

  const handleShare = useCallback(
    async (achievement: AchievementDefinition) => {
      const text = buildShareText(achievement, locale);
      try {
        await navigator.clipboard?.writeText(text);
        setCopiedId(achievement.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Clipboard not available
      }
    },
    [locale],
  );

  const isKo = locale === "ko";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80">
            {isKo ? "업적 쇼케이스" : "Achievement Showcase"}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {unlockedCount}/{totalCount}{" "}
            {isKo ? "업적 달성" : "achievements earned"}
          </p>
        </div>
        {/* Overall progress ring */}
        <div className="relative h-14 w-14">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="url(#gold-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(unlockedCount / Math.max(totalCount, 1)) * 150.8} 150.8`}
            />
            <defs>
              <linearGradient id="gold-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-amber-200">
            {Math.round((unlockedCount / Math.max(totalCount, 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SHOWCASE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const catLabel = getLocalizedText(cat.label, locale);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              {catLabel}
            </button>
          );
        })}
      </div>

      {/* Achievement Grid */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2"
        layout
      >
        <AnimatePresence mode="popLayout">
          {sortedAchievements.map((achievement, index) => {
            const isUnlocked = unlockedSet.has(achievement.id);
            const unlockData = unlockedMap.get(achievement.id);
            const style = isUnlocked
              ? RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common
              : LOCKED_STYLE;
            const progress = !isUnlocked
              ? computeAchievementProgress(achievement, enrichedStats)
              : null;
            const showProgress = progress !== null && progress.percent > 0 && progress.percent < 100;
            const isCopied = copiedId === achievement.id;

            return (
              <motion.button
                key={achievement.id}
                type="button"
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(index * 0.05, 0.5),
                  layout: { duration: 0.25 },
                }}
                onClick={() => {
                  if (isUnlocked) void handleShare(achievement);
                }}
                disabled={!isUnlocked}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${style.border} ${style.bg} ${style.glow} ${
                  isUnlocked
                    ? "cursor-pointer hover:brightness-110 active:scale-[0.98]"
                    : "cursor-default"
                }`}
              >
                {/* Earned golden accent line */}
                {isUnlocked && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                      isUnlocked
                        ? "bg-white/10"
                        : "bg-white/[0.04] grayscale"
                    }`}
                  >
                    {isUnlocked ? achievement.icon : "???"}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Name */}
                    <p
                      className={`text-sm font-medium leading-tight ${
                        isUnlocked ? "text-white" : "text-white/30"
                      }`}
                    >
                      {isUnlocked
                        ? getLocalizedText(achievement.label, locale)
                        : "???"}
                    </p>

                    {/* Description */}
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        isUnlocked ? "text-white/55" : "text-white/20"
                      }`}
                    >
                      {isUnlocked
                        ? getLocalizedText(achievement.description, locale)
                        : isKo
                          ? "아직 잠겨있는 업적입니다"
                          : "This achievement is still locked"}
                    </p>

                    {/* Date earned */}
                    {isUnlocked && unlockData && (
                      <p className="mt-1.5 text-[10px] text-white/35">
                        {formatDate(unlockData.unlocked_at, locale)}
                      </p>
                    )}

                    {/* Rarity badge */}
                    {isUnlocked && (
                      <span
                        className={`mt-1.5 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider ${style.text}`}
                      >
                        {achievement.rarity}
                      </span>
                    )}

                    {/* Progress bar for nearly-complete locked achievements */}
                    {showProgress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-white/30">
                          <span>
                            {progress.current}/{progress.target}
                          </span>
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/40"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.percent}%` }}
                            transition={{ duration: 0.6, delay: index * 0.05 + 0.3 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Share confirmation tooltip */}
                <AnimatePresence>
                  {isCopied && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-3 top-3 rounded-lg bg-amber-500/90 px-2 py-1 text-[10px] font-medium text-black"
                    >
                      {isKo ? "복사됨!" : "Copied!"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {sortedAchievements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl">🏅</span>
          <p className="mt-3 text-sm text-white/40">
            {isKo
              ? "이 카테고리에는 아직 업적이 없습니다"
              : "No achievements in this category yet"}
          </p>
        </div>
      )}
    </div>
  );
}
