"use client";

import { motion } from "framer-motion";

const EMOTION_MAP: Record<string, { color: string; icon: string }> = {
  joy: { color: "#fbbf24", icon: "😊" },
  happiness: { color: "#fbbf24", icon: "😊" },
  love: { color: "#f472b6", icon: "💕" },
  sadness: { color: "#60a5fa", icon: "😢" },
  melancholy: { color: "#60a5fa", icon: "😢" },
  anger: { color: "#ef4444", icon: "😤" },
  surprise: { color: "#a78bfa", icon: "😲" },
  fear: { color: "#6b7280", icon: "😨" },
  calm: { color: "#34d399", icon: "😌" },
  neutral: { color: "#9ca3af", icon: "😐" },
  energetic: { color: "#fb923c", icon: "⚡" },
  curious: { color: "#22d3ee", icon: "🤔" },
  playful: { color: "#f97316", icon: "😜" },
  thoughtful: { color: "#818cf8", icon: "🤔" },
  joyful: { color: "#fbbf24", icon: "😊" },
};

interface EmotionTagProps {
  emotion: string | null;
  compact?: boolean;
}

/**
 * Emotion tag — visual indicator of the creature's emotional state in messages.
 * Inspired by Replika's mood indicators and Nomi AI's emotion tracking.
 * joy=gold, sadness=blue, anger=red, love=pink, etc.
 */
export function EmotionTag({ emotion, compact = false }: EmotionTagProps) {
  if (!emotion) return null;

  const mapped = EMOTION_MAP[emotion.toLowerCase()] ?? EMOTION_MAP.neutral;

  if (compact) {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-flex items-center text-[10px]"
        title={emotion}
      >
        {mapped.icon}
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${mapped.color}15`,
        color: mapped.color,
        border: `1px solid ${mapped.color}30`,
      }}
    >
      <span>{mapped.icon}</span>
      <span>{emotion}</span>
    </motion.span>
  );
}
