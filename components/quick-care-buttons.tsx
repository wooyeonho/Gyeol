"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";

interface QuickCareButtonsProps {
  vitality: number;
  onCareComplete?: (action: string) => void;
}

const CARE_ACTIONS = [
  { key: "feed", icon: "🍎", labelKo: "먹이기", labelEn: "Feed", color: "#4ade80" },
  { key: "rest", icon: "💤", labelKo: "재우기", labelEn: "Rest", color: "#818cf8" },
  { key: "play", icon: "🎾", labelKo: "놀기", labelEn: "Play", color: "#fb923c" },
] as const;

/**
 * Tamagotchi-style 3-button quick-care bar.
 * Compact enough to place on the home page for instant creature care.
 */
export function QuickCareButtons({ vitality, onCareComplete }: QuickCareButtonsProps) {
  const { locale, t } = useTranslations();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});

  const handleCare = useCallback(async (action: string) => {
    if (cooldowns[action]) return;

    haptic("send");
    setActiveAction(action);
    setCooldowns((prev) => ({ ...prev, [action]: true }));

    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        haptic("success");
        onCareComplete?.(action);
      }
    } catch {
      // Network error — silent fail
    } finally {
      setActiveAction(null);
      // 30s cooldown per action
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [action]: false }));
      }, 30_000);
    }
  }, [cooldowns, onCareComplete]);

  const isLow = vitality < 0.3;

  return (
    <div className="flex items-center justify-center gap-3">
      {CARE_ACTIONS.map((action) => {
        const isActive = activeAction === action.key;
        const isCooling = cooldowns[action.key];
        const label = locale === "ko" ? action.labelKo : action.labelEn;

        return (
          <motion.button
            key={action.key}
            type="button"
            onClick={() => handleCare(action.key)}
            disabled={isCooling || isActive}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 transition-all disabled:opacity-40"
            style={{
              borderColor: isLow && action.key === "feed" ? `${action.color}60` : "rgba(255,255,255,0.08)",
              background: isLow && action.key === "feed" ? `${action.color}12` : "rgba(255,255,255,0.04)",
            }}
          >
            <AnimatePresence mode="wait">
              {isActive ? (
                <motion.span
                  key="loading"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-2xl"
                >
                  {action.icon}
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-2xl"
                >
                  {action.icon}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="text-[10px] font-medium text-white/60">{label}</span>
            {/* Urgency pulse when vitality is low */}
            {isLow && action.key === "feed" && !isCooling && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ border: `1px solid ${action.color}` }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
