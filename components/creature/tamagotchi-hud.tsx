"use client";

/**
 * TamagotchiHUD — Pokemon/Tamagotchi-style creature status display.
 *
 * Features:
 * - 3 animated gauge bars: Energy ⚡, Happiness 💛, Hunger 🍚
 * - Framer Motion smooth fill animations on value change
 * - Critical-state pulse + warning banner
 * - Floating mood emoji above the HUD (MoodBubble)
 * - Full accessibility: role="status", aria-label per gauge
 * - Reduced-motion safe (instant transitions when prefers-reduced-motion)
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { haptic } from "@/lib/micro-interactions";

// ── Types ──────────────────────────────────────────────────────────────────

export type MoodKey =
  | "happy"
  | "loved"
  | "hungry"
  | "tired"
  | "bored"
  | "excited"
  | "sad"
  | "neutral";

export interface TamagotchiHUDProps {
  /** 0–100 */
  energy: number;
  /** 0–100 */
  happiness: number;
  /** 0–100 — 100 = full/satisfied, 0 = starving */
  hunger: number;
  mood?: MoodKey | string | null;
  locale?: string;
  /** Show compact single-row layout (for cards / mini-view) */
  compact?: boolean;
  /** Called when user taps a care action button */
  onCareAction?: (action: "feed" | "rest" | "play") => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<MoodKey, string> = {
  happy: "😊",
  loved: "🥰",
  hungry: "😋",
  tired: "😴",
  bored: "😑",
  excited: "🤩",
  sad: "😢",
  neutral: "😐",
};

const MOOD_LABEL: Record<MoodKey, { ko: string; en: string }> = {
  happy: { ko: "행복해요", en: "Happy" },
  loved: { ko: "사랑받는 중", en: "Loved" },
  hungry: { ko: "배고파요", en: "Hungry" },
  tired: { ko: "피곤해요", en: "Tired" },
  bored: { ko: "심심해요", en: "Bored" },
  excited: { ko: "신나요!", en: "Excited!" },
  sad: { ko: "슬퍼요", en: "Sad" },
  neutral: { ko: "평온해요", en: "Calm" },
};

interface StatConfig {
  key: "energy" | "happiness" | "hunger";
  icon: string;
  label: { ko: string; en: string };
  color: string;
  criticalColor: string;
  warnBelow: number;
  careAction?: "feed" | "rest" | "play";
  ariaLabel: { ko: string; en: string };
}

const STATS: StatConfig[] = [
  {
    key: "energy",
    icon: "⚡",
    label: { ko: "에너지", en: "Energy" },
    color: "from-cyan-400 to-blue-400",
    criticalColor: "from-red-400 to-orange-400",
    warnBelow: 20,
    careAction: "rest",
    ariaLabel: { ko: "에너지 게이지", en: "Energy gauge" },
  },
  {
    key: "happiness",
    icon: "💛",
    label: { ko: "행복", en: "Happiness" },
    color: "from-yellow-400 to-amber-400",
    criticalColor: "from-red-400 to-pink-400",
    warnBelow: 25,
    careAction: "play",
    ariaLabel: { ko: "행복 게이지", en: "Happiness gauge" },
  },
  {
    key: "hunger",
    icon: "🍚",
    label: { ko: "포만감", en: "Hunger" },
    color: "from-green-400 to-emerald-400",
    criticalColor: "from-orange-400 to-red-400",
    warnBelow: 20,
    careAction: "feed",
    ariaLabel: { ko: "포만감 게이지", en: "Hunger gauge" },
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function GaugeBar({
  stat,
  value,
  locale,
  onCareAction,
  reducedMotion,
}: {
  stat: StatConfig;
  value: number;
  locale: string;
  onCareAction?: (action: "feed" | "rest" | "play") => void;
  reducedMotion: boolean | null;
}) {
  const isKo = locale === "ko";
  const isCritical = value <= stat.warnBelow;
  const pct = Math.max(0, Math.min(100, value));
  const label = stat.label[isKo ? "ko" : "en"];
  const ariaLabel = stat.ariaLabel[isKo ? "ko" : "en"];

  return (
    <div className="flex items-center gap-2.5 group">
      {/* Icon + tap-to-care affordance */}
      <motion.button
        type="button"
        onClick={() => {
          if (!stat.careAction || !onCareAction) return;
          haptic("care");
          onCareAction(stat.careAction);
        }}
        aria-label={isKo ? `${label} 돌보기` : `Care: ${label}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lg transition-colors hover:bg-white/10 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
        whileTap={reducedMotion ? {} : { scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {stat.icon}
      </motion.button>

      {/* Gauge track */}
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/50">{label}</span>
          <motion.span
            key={pct}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[10px] font-semibold tabular-nums ${isCritical ? "text-red-400" : "text-white/60"}`}
          >
            {pct}%
          </motion.span>
        </div>

        <div
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
        >
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${isCritical ? stat.criticalColor : stat.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
            }
          />
        </div>
      </div>

      {/* Critical pulse dot */}
      {isCritical && (
        <motion.div
          className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400"
          animate={reducedMotion ? {} : { opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.0 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** Floating mood bubble with bounce-in animation */
function MoodBubble({
  mood,
  locale,
  reducedMotion,
}: {
  mood: string | null | undefined;
  locale: string;
  reducedMotion: boolean | null;
}) {
  const isKo = locale === "ko";
  const moodKey = (mood ?? "neutral") as MoodKey;
  const emoji = MOOD_EMOJI[moodKey] ?? "😐";
  const moodLabel = MOOD_LABEL[moodKey]?.[isKo ? "ko" : "en"] ?? mood ?? "";

  return (
    <motion.div
      key={moodKey}
      initial={reducedMotion ? false : { scale: 0, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="flex items-center gap-1.5 self-start"
      aria-live="polite"
      aria-label={isKo ? `현재 기분: ${moodLabel}` : `Current mood: ${moodLabel}`}
    >
      <motion.span
        className="text-2xl"
        animate={reducedMotion ? {} : {
          y: [0, -4, 0],
          rotate: [-5, 5, -5],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.8,
          ease: "easeInOut",
        }}
        aria-hidden="true"
      >
        {emoji}
      </motion.span>
      <span className="text-[11px] font-medium text-white/60">{moodLabel}</span>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function TamagotchiHUD({
  energy,
  happiness,
  hunger,
  mood,
  locale = "ko",
  compact = false,
  onCareAction,
}: TamagotchiHUDProps) {
  const reducedMotion = useReducedMotion();
  const isKo = locale === "ko";
  const prevEnergy = useRef(energy);
  const prevHappiness = useRef(happiness);

  // Haptic pulse when a stat drops below the critical threshold
  useEffect(() => {
    const dropped =
      (energy <= 20 && prevEnergy.current > 20) ||
      (happiness <= 25 && prevHappiness.current > 25);
    if (dropped) haptic("warning");
    prevEnergy.current = energy;
    prevHappiness.current = happiness;
  }, [energy, happiness]);

  const values: Record<"energy" | "happiness" | "hunger", number> = {
    energy,
    happiness,
    hunger,
  };

  const criticalCount = STATS.filter((s) => values[s.key] <= s.warnBelow).length;

  // ── Compact layout ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        role="status"
        aria-label={isKo ? "크리처 상태" : "Creature status"}
        className="flex items-center gap-3"
      >
        {STATS.map((stat) => (
          <div key={stat.key} className="flex items-center gap-1.5">
            <span className="text-sm" aria-hidden="true">{stat.icon}</span>
            <div
              role="progressbar"
              aria-label={stat.ariaLabel[isKo ? "ko" : "en"]}
              aria-valuenow={values[stat.key]}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10"
            >
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${
                  values[stat.key] <= stat.warnBelow
                    ? stat.criticalColor
                    : stat.color
                }`}
                animate={{ width: `${Math.max(0, Math.min(100, values[stat.key]))}%` }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
        {criticalCount > 0 && (
          <motion.span
            className="text-[11px] font-bold text-red-400"
            animate={reducedMotion ? {} : { opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            aria-label={isKo ? "돌봄 필요" : "Needs care"}
          >
            !
          </motion.span>
        )}
      </div>
    );
  }

  // ── Full layout ────────────────────────────────────────────────────────
  return (
    <section
      role="status"
      aria-label={isKo ? "크리처 상태 패널" : "Creature status panel"}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm space-y-3"
    >
      {/* Header: mood bubble + critical warning */}
      <div className="flex items-center justify-between">
        <MoodBubble mood={mood} locale={locale} reducedMotion={reducedMotion} />
        {criticalCount > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1"
          >
            <motion.span
              className="text-xs"
              animate={reducedMotion ? {} : { scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              aria-hidden="true"
            >
              ⚠️
            </motion.span>
            <span className="text-[10px] font-semibold text-red-400">
              {isKo ? "돌봄 필요!" : "Needs care!"}
            </span>
          </motion.div>
        )}
      </div>

      {/* Gauge bars */}
      <div className="space-y-2.5">
        {STATS.map((stat) => (
          <GaugeBar
            key={stat.key}
            stat={stat}
            value={values[stat.key]}
            locale={locale}
            onCareAction={onCareAction}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </section>
  );
}
