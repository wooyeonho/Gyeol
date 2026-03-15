"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "@/components/i18n-provider";
import { type RewardResult } from "@/lib/rewards/variable-reward";

type RewardToastProps = {
  reward: RewardResult | null;
  locale: Locale;
  onDismiss: () => void;
};

export function RewardToast({ reward, locale, onDismiss }: RewardToastProps) {
  const { t } = useTranslations();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = reward !== null && reward.tier !== "none";
  const isJackpot = reward?.tier === "jackpot";
  const rewardLines = reward
    ? [
        reward.delta.coins ? `+${reward.delta.coins} ${t("rewardToast.coins")}` : null,
        reward.delta.emoji_dust ? `+${reward.delta.emoji_dust} ${t("rewardToast.emojiDust")}` : null,
        reward.delta.title_shards ? `+${reward.delta.title_shards} ${t("rewardToast.titleShards")}` : null,
        reward.delta.appearance_shards ? `+${reward.delta.appearance_shards} ${t("rewardToast.appearanceShards")}` : null,
        reward.delta.evolution_points ? `+${reward.delta.evolution_points} ${t("rewardToast.evolutionPoints")}` : null,
        reward.delta.streak_freezes ? `+${reward.delta.streak_freezes} ${t("rewardToast.streakFreeze")}` : null,
      ].filter(Boolean)
    : [];

  useEffect(() => {
    if (show) {
      timerRef.current = setTimeout(() => onDismiss(), isJackpot ? 5200 : 4200);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [show, onDismiss, isJackpot]);

  return (
    <AnimatePresence>
      {show && reward && (
        <motion.div
          className={`fixed left-1/2 z-50 -translate-x-1/2 ${isJackpot ? "inset-0 flex items-center justify-center px-4" : "top-6"}`}
          initial={{ opacity: 0, y: isJackpot ? 0 : -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isJackpot ? 0 : -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          aria-live="polite"
        >
          {isJackpot && (
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.22),rgba(0,0,0,0.88)_60%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <div
            className={`relative rounded-[2rem] border px-5 py-4 shadow-lg backdrop-blur-md ${isJackpot ? "w-full max-w-md text-center" : "flex items-center gap-3"}`}
            style={{
              background: isJackpot
                ? "rgba(245,158,11,0.15)"
                : reward.tier === "large"
                  ? "rgba(168,85,247,0.14)"
                  : "rgba(255,255,255,0.10)",
              borderColor: isJackpot
                ? "rgba(245,158,11,0.45)"
                : reward.tier === "large"
                  ? "rgba(168,85,247,0.32)"
                  : "rgba(255,255,255,0.18)",
            }}
          >
            <motion.span
              className={isJackpot ? "mx-auto text-5xl" : "text-3xl"}
              animate={
                isJackpot
                  ? { rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.25, 1] }
                  : { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.15, 1] }
              }
              transition={{ duration: 0.8 }}
            >
              {reward.icon}
            </motion.span>
            <div className={isJackpot ? "mt-4" : ""}>
              <p className={`${isJackpot ? "text-2xl" : "text-base"} font-semibold text-white`}>
                {locale === "ko" ? reward.label.ko : reward.label.en}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                {locale === "ko" ? reward.detail.ko : reward.detail.en}
              </p>
              {reward.streakMultiplier > 1 && (
                <p className="mt-2 text-sm font-medium text-amber-100/95">
                  {`${t("rewardToast.streakBonus")} x${reward.streakMultiplier}`}
                </p>
              )}
              <div className={`mt-3 flex flex-wrap ${isJackpot ? "justify-center" : ""} gap-2`}>
                {rewardLines.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-sm text-white/88"
                  >
                    {line}
                  </span>
                ))}
              </div>
              {reward.guaranteed && reward.source === "message" && (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/65">
                  {t("rewardToast.guaranteedDrop")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
