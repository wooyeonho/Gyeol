"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StreakShieldProps {
  /** Number of shields the user has */
  count: number;
  onUse?: () => void;
  size?: "sm" | "md";
}

/**
 * Streak Shield — protects against losing a streak for one day.
 * Visual indicator + optional use button.
 */
export function StreakShield({ count, onUse, size = "md" }: StreakShieldProps) {
  const [justUsed, setJustUsed] = useState(false);

  const handleUse = () => {
    if (count <= 0 || !onUse) return;
    setJustUsed(true);
    onUse();
    setTimeout(() => setJustUsed(false), 2000);
  };

  const px = size === "sm" ? 16 : 22;

  return (
    <div className="flex items-center gap-1.5">
      {/* Shield icon */}
      <motion.div
        style={{ width: px, height: px }}
        animate={count > 0 ? { scale: [1, 1.08, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L4 6v6c0 5.25 3.5 10 8 12 4.5-2 8-6.75 8-12V6L12 2z"
            fill={count > 0 ? "#3b82f6" : "#374151"}
            stroke={count > 0 ? "#93c5fd" : "#4b5563"}
            strokeWidth="1"
          />
          {count > 0 && (
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </motion.div>

      {/* Count badge */}
      <span
        className={`font-bold tabular-nums ${
          size === "sm" ? "text-xs" : "text-sm"
        } ${count > 0 ? "text-blue-400" : "text-white/30"}`}
      >
        ×{count}
      </span>

      {/* Use button */}
      {onUse && count > 0 && (
        <motion.button
          className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
          onClick={handleUse}
          whileTap={{ scale: 0.95 }}
          disabled={justUsed}
        >
          사용
        </motion.button>
      )}

      {/* Used feedback */}
      <AnimatePresence>
        {justUsed && (
          <motion.span
            className="text-[10px] text-blue-300"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            쉴드 사용됨!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
