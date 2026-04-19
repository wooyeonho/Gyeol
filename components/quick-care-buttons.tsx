"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";
import { useTranslations } from "@/components/i18n-provider";

interface QuickCareButtonsProps {
  vitality: number;
  onCareComplete?: (action: string) => void;
  /** Called instead of fetch when the device is offline */
  onOfflineAction?: (action: string) => Promise<void>;
  /** Number of pending offline actions awaiting server sync */
  pendingCount?: number;
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
export function QuickCareButtons({ vitality, onCareComplete, onOfflineAction, pendingCount = 0 }: QuickCareButtonsProps) {
  const { locale, t } = useTranslations();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});

  const handleCare = useCallback(async (action: string) => {
    if (cooldowns[action]) return;

    haptic("send");
    setActiveAction(action);
    setCooldowns((prev) => ({ ...prev, [action]: true }));

    try {
      if (!navigator.onLine && onOfflineAction) {
        // Offline path: apply locally and queue for later sync
        await onOfflineAction(action);
        haptic("success");
        onCareComplete?.(action);
      } else {
        const res = await fetch("/api/care", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          haptic("success");
          onCareComplete?.(action);
        }
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
  }, [cooldowns, onCareComplete, onOfflineAction]);

  const isLow = vitality < 0.3;

  return (
    <div className="flex flex-col items-center gap-2">
      {pendingCount > 0 && (
        <motion.p
          className="text-[10px] text-amber-400/80 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {locale === "ko" ? `⏳ ${pendingCount}개 동기화 대기 중` : `⏳ ${pendingCount} pending sync`}
        </motion.p>
      )}
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
            className="glass-card btn-3d relative flex flex-col items-center gap-1 rounded-2xl px-4 py-3 transition-all disabled:opacity-40"
            style={{
              borderColor: isLow && action.key === "feed" ? `${action.color}60` : undefined,
              background: isLow && action.key === "feed" ? `${action.color}12` : undefined,
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
    </div>
  );
}
