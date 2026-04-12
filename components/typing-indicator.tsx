"use client";

import { motion } from "framer-motion";

/**
 * KakaoTalk-style typing indicator — "결이 생각하는 중..."
 * Three dots with staggered bounce animation using Framer Motion.
 * Dark glassmorphism style matching the app theme.
 */

const dotVariants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      delay: i * 0.15,
      ease: "easeInOut" as const,
    },
  }),
} as const;

export function TypingIndicator({
  accentColor,
  creatureName,
}: {
  accentColor?: string;
  creatureName?: string;
}) {
  const displayName = creatureName || "결";
  const dotColor = accentColor
    ? `color-mix(in srgb, ${accentColor} 60%, white)`
    : "rgba(255,255,255,0.4)";

  return (
    <div
      className="flex items-center gap-2.5"
      role="status"
      aria-live="polite"
      aria-label={`${displayName} thinking...`}
    >
      <div
        className="flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/5 px-4 py-3 backdrop-blur-md"
        style={{
          boxShadow: accentColor
            ? `0 0 12px ${accentColor}08, 0 0 0 1px ${accentColor}10 inset`
            : undefined,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dotColor }}
            custom={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
          />
        ))}
      </div>
      <span className="text-xs text-white/30">
        {displayName} ...
      </span>
    </div>
  );
}
