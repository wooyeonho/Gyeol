"use client";

import { motion } from "framer-motion";

/**
 * iMessage-style typing indicator — glass bubble with a rounded tail anchor,
 * three dots bouncing in sequence, and a localized "thinking..." label.
 */

const dotVariants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [0, -6, 0],
    opacity: [0.45, 1, 0.45],
    transition: {
      duration: 0.9,
      repeat: Infinity,
      delay: i * 0.18,
      ease: "easeInOut" as const,
    },
  }),
} as const;

export function TypingIndicator({
  accentColor,
  creatureName,
  label,
}: {
  accentColor?: string;
  creatureName?: string;
  /** Localized label template containing `{name}` (e.g. "{name} is thinking..."). */
  label?: string;
}) {
  const displayName = creatureName || "결";
  const resolvedLabel = (label ?? "{name}이 생각하는 중...").replace("{name}", displayName);
  const dotColor = accentColor
    ? `color-mix(in srgb, ${accentColor} 72%, white)`
    : "rgba(255,255,255,0.55)";
  const borderColor = accentColor ? `${accentColor}28` : "rgba(255,255,255,0.08)";
  const bubbleBg = accentColor ? `${accentColor}0c` : "rgba(255,255,255,0.05)";

  return (
    <div
      className="flex items-center gap-2.5"
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel}
    >
      <div className="relative">
        {/* Main bubble */}
        <div
          className="flex items-center gap-1.5 rounded-2xl border px-4 py-3 backdrop-blur-md"
          style={{
            borderColor,
            backgroundColor: bubbleBg,
            boxShadow: accentColor
              ? `0 6px 24px -12px ${accentColor}40, 0 0 0 1px ${accentColor}12 inset`
              : "0 6px 24px -16px rgba(0,0,0,0.6)",
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
        {/* iMessage-style tail anchor — two stacked circles on the bottom-left. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -left-1 h-2.5 w-2.5 rounded-full border"
          style={{ borderColor, backgroundColor: bubbleBg }}
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 -left-2 h-1.5 w-1.5 rounded-full border"
          style={{ borderColor, backgroundColor: bubbleBg }}
        />
      </div>
      <span className="text-xs text-white/40">{resolvedLabel}</span>
    </div>
  );
}
