"use client";

import { motion, AnimatePresence } from "framer-motion";

interface StreakFlameProps {
  days: number;
  /** Show pulse animation when within 20 min of losing streak */
  atRisk?: boolean;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

function flameColor(days: number): { outer: string; inner: string; glow: string } {
  if (days === 0) return { outer: "#6b7280", inner: "#9ca3af", glow: "rgba(107,114,128,0.3)" };
  if (days < 7)  return { outer: "#f97316", inner: "#fbbf24", glow: "rgba(249,115,22,0.4)" };
  // 7+ days: golden flame
  return { outer: "#f59e0b", inner: "#fef08a", glow: "rgba(245,158,11,0.6)" };
}

const SIZE = { sm: 20, md: 28, lg: 40 };

export function StreakFlame({ days, atRisk = false, size = "md", showCount = true }: StreakFlameProps) {
  const px = SIZE[size];
   

  const { outer, inner, glow: _glow } = flameColor(days);
  const isGolden = days >= 7;

  return (
    <div className="flex items-center gap-1.5">
      {/* Flame SVG with animation */}
      <motion.div
        style={{ width: px, height: px }}
        animate={
          atRisk
            ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }
            : isGolden
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={
          atRisk
            ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
            : isGolden
            ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
            : {}
        }
      >
        {days === 0 ? (
          // Empty flame outline
          <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C12 2 7 8 7 14a5 5 0 0010 0c0-6-5-12-5-12z"
              stroke={outer}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Glow filter */}
            <defs>
              <filter id={`glow-${days}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Outer flame */}
            <motion.path
              d="M12 2C12 2 6 9 6 15a6 6 0 0012 0C18 9 12 2 12 2z"
              fill={outer}
              filter={isGolden ? `url(#glow-${days})` : undefined}
              animate={{ d: [
                "M12 2C12 2 6 9 6 15a6 6 0 0012 0C18 9 12 2 12 2z",
                "M12 2C12 2 5.5 9.5 6 15.5a6 6 0 0012 0C18.5 9.5 12 2 12 2z",
                "M12 2C12 2 6 9 6 15a6 6 0 0012 0C18 9 12 2 12 2z",
              ]}}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
            {/* Inner flame core */}
            <motion.path
              d="M12 8C12 8 9 12 9 15.5a3 3 0 006 0C15 12 12 8 12 8z"
              fill={inner}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            />
            {/* Golden particles for 7+ day streaks */}
            {isGolden && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={10 + i * 2}
                    cy={8}
                    r={0.8}
                    fill="#fef08a"
                    animate={{
                      cy: [8, 4, 2],
                      opacity: [0, 1, 0],
                      cx: [10 + i * 2, 10 + i * 2 + (i - 1) * 2, 10 + i * 2 + (i - 1) * 3],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      delay: i * 0.4,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </svg>
        )}
      </motion.div>

      {/* Day count */}
      {showCount && (
        <span
          className={`font-bold tabular-nums ${
            size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm"
          } ${
            days === 0
              ? "text-white/30"
              : days >= 7
              ? "text-amber-400"
              : "text-orange-400"
          }`}
        >
          {days}
        </span>
      )}

      {/* At-risk warning */}
      <AnimatePresence>
        {atRisk && days > 0 && (
          <motion.span
            className="text-[10px] font-semibold text-red-400"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            위기!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
