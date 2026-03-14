"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type RewardResult } from "@/lib/rewards/variable-reward";

type RewardToastProps = {
  reward: RewardResult | null;
  locale: "ko" | "en";
  onDismiss: () => void;
};

export function RewardToast({ reward, locale, onDismiss }: RewardToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = reward !== null && reward.tier !== "none";

  useEffect(() => {
    if (show) {
      timerRef.current = setTimeout(() => onDismiss(), 4000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && reward && (
        <motion.div
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2"
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-lg backdrop-blur-md"
            style={{
              background: reward.tier === "jackpot"
                ? "rgba(245,158,11,0.15)"
                : reward.tier === "large"
                  ? "rgba(168,85,247,0.12)"
                  : "rgba(255,255,255,0.08)",
              borderColor: reward.tier === "jackpot"
                ? "rgba(245,158,11,0.35)"
                : reward.tier === "large"
                  ? "rgba(168,85,247,0.30)"
                  : "rgba(255,255,255,0.15)",
            }}
          >
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
            >
              {reward.icon}
            </motion.span>
            <div>
              <p className="text-sm font-semibold text-white">{reward.label[locale]}</p>
              {reward.coins > 0 && (
                <p className="text-xs text-white/60">+{reward.coins} coins</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
