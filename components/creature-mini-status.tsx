"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { worldClassMotion, numberColor } from "@/lib/design/world-class-playbook";

export interface CreatureMiniStatusProps {
  /** Creature name */
  selfName: string;
  /** Current mood */
  mood: string | null;
  /** Vitality 0-1 */
  vitality: number;
  /** Current creature activity description */
  activity: string;
  /** Accent / primary color */
  primaryColor: string;
}

const MOOD_EMOJI: Record<string, string> = {
  joyful: "\u{1F60A}", excited: "\u{1F929}", playful: "\u{1F61C}", loving: "\u{1F970}",
  proud: "\u{1F624}", peaceful: "\u{1F60C}", curious: "\u{1F9D0}", dreamy: "\u{1F634}",
  sad: "\u{1F622}", melancholy: "\u{1F614}", lonely: "\u{1F97A}", angry: "\u{1F620}",
  frustrated: "\u{1F623}", surprised: "\u{1F632}", scared: "\u{1F630}", shy: "\u{1F648}",
};

/** Resolve mood string to emoji, defaulting to neutral face. */
export function resolveMoodEmoji(mood: string | null): string {
  if (!mood) return "\u{1F610}";
  return MOOD_EMOJI[mood] ?? "\u{1F610}";
}

/**
 * Apple Dynamic Island-inspired mini status bar.
 *
 * Fixed at the top of the viewport. Shows creature mood + vitality as a
 * compact always-visible indicator. Tapping expands it into a card with
 * more details (activity, full vitality bar, name). Uses spring-based
 * Framer Motion transitions for a fluid, physical feel.
 */
export function CreatureMiniStatus({
  selfName,
  mood,
  vitality,
  activity,
  primaryColor,
}: CreatureMiniStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const emoji = resolveMoodEmoji(mood);
  const vitalityPercent = Math.round(vitality * 100);
  const isLow = vitality < 0.3;
  const barColor = isLow ? "#ef4444" : primaryColor;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50">
      <motion.button
        type="button"
        onClick={toggle}
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="flex flex-col items-center rounded-[22px] border border-white/10 bg-black/70 backdrop-blur-xl shadow-lg shadow-black/40 cursor-pointer overflow-hidden"
        style={{ minWidth: expanded ? 220 : undefined }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`${selfName}: ${mood ?? "neutral"}, vitality ${vitalityPercent}%`}
        aria-expanded={expanded}
        data-testid="creature-mini-status"
      >
        {/* Collapsed row — always visible */}
        <motion.div layout="position" className="flex items-center gap-2 px-3 py-1.5">
          {/* Mood emoji — Calm-style breath loop (4s in / 6s out) from the
              world-class design playbook so the idle surface feels alive. */}
          <motion.span
            className="text-sm"
            role="img"
            aria-label={mood ?? "neutral"}
            animate={{ scale: [1, 1.035, 1] }}
            transition={{
              duration: worldClassMotion.breathLoop.transition.duration,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.4, 1],
            }}
          >
            {emoji}
          </motion.span>

          {/* Name */}
          <span className="text-[11px] font-medium text-white/60 max-w-[80px] truncate">
            {selfName}
          </span>

          {/* Vitality mini bar */}
          <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: barColor }}
              animate={{ width: `${vitalityPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Vitality number — Robinhood number-theater color (semantic
              direction). isLow → "down" red, healthy → neutral slate. */}
          <span
            className={`text-[10px] tabular-nums font-medium ${isLow ? "animate-pulse" : ""}`}
            style={{ color: numberColor(isLow ? "down" : "neutral") }}
          >
            {vitalityPercent}%
          </span>
        </motion.div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="expanded-details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full overflow-hidden"
            >
              <div className="px-4 pb-3 pt-1 flex flex-col gap-2 border-t border-white/5">
                {/* Activity */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/30">Activity</span>
                  <span className="text-[11px] text-white/70 truncate">{activity}</span>
                </div>

                {/* Mood label */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/30">Mood</span>
                  <span className="text-[11px] text-white/70 capitalize">{mood ?? "neutral"}</span>
                </div>

                {/* Full-width vitality bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Vitality</span>
                    <span
                      className={`text-[10px] tabular-nums font-semibold ${isLow ? "text-red-400" : "text-white/50"}`}
                    >
                      {vitalityPercent}%
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: barColor }}
                      animate={{ width: `${vitalityPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
