"use client";

import { motion } from "framer-motion";

interface CreatureMiniStatusProps {
  /** Creature name */
  name: string;
  /** Current mood */
  mood: string | null;
  /** Vitality 0-1 */
  vitality: number;
  /** Accent color */
  accentColor?: string;
  /** Click handler */
  onClick?: () => void;
}

const MOOD_EMOJI: Record<string, string> = {
  joyful: "😊", excited: "🤩", playful: "😜", loving: "🥰",
  proud: "😤", peaceful: "😌", curious: "🧐", dreamy: "😴",
  sad: "😢", melancholy: "😔", lonely: "🥺", angry: "😠",
  frustrated: "😣", surprised: "😲", scared: "😰", shy: "🙈",
};

/**
 * Apple Dynamic Island-inspired mini status bar.
 * Shows creature mood + vitality as a compact always-visible indicator.
 * Placed at the top of the screen for constant awareness.
 */
export function CreatureMiniStatus({
  name,
  mood,
  vitality,
  accentColor = "#22d3ee",
  onClick,
}: CreatureMiniStatusProps) {
  const emoji = mood ? MOOD_EMOJI[mood] ?? "😐" : "😐";
  const vitalityPercent = Math.round(vitality * 100);
  const isLow = vitality < 0.3;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-2 rounded-full border border-white/8 bg-black/70 px-3 py-1.5 backdrop-blur-xl transition-colors hover:bg-black/80"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${name}: ${mood ?? "neutral"}, vitality ${vitalityPercent}%`}
    >
      {/* Mood emoji */}
      <span className="text-sm">{emoji}</span>

      {/* Name */}
      <span className="text-[11px] font-medium text-white/60 max-w-[80px] truncate">
        {name}
      </span>

      {/* Vitality bar */}
      <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: isLow ? "#ef4444" : accentColor }}
          animate={{ width: `${vitalityPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Vitality number */}
      <span
        className={`text-[10px] tabular-nums font-medium ${isLow ? "text-red-400 animate-pulse" : "text-white/40"}`}
      >
        {vitalityPercent}%
      </span>
    </motion.button>
  );
}
