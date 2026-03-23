"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import {
  initOrRefreshDailyChallenges,
  generateDailyChallenges,
  getTodayDateString,
  getPerfectDayBonus,
  isAllChallengesCompleted,
  type DailyChallengeState,
  type ChallengeDifficulty,
} from "@/lib/engagement/daily-challenge";

const DIFFICULTY_CONFIG: Record<ChallengeDifficulty, { label: string; color: string; glow: string; bg: string }> = {
  easy:   { label: "Easy",   color: "text-emerald-300", glow: "shadow-emerald-500/20", bg: "border-emerald-500/30 bg-emerald-500/8" },
  medium: { label: "Medium", color: "text-amber-300",   glow: "shadow-amber-500/20",   bg: "border-amber-500/30 bg-amber-500/8" },
  hard:   { label: "Hard",   color: "text-rose-300",    glow: "shadow-rose-500/20",    bg: "border-rose-500/30 bg-rose-500/8" },
};

export default function ChallengesPage() {
  const { t } = useTranslations();
  const [state, setState] = useState<DailyChallengeState | null>(null);
  const [definitions, setDefinitions] = useState<ReturnType<typeof generateDailyChallenges>>([]);
  const [showPerfect, setShowPerfect] = useState(false);

  useEffect(() => {
    const s = initOrRefreshDailyChallenges();
    setState(s);
    setDefinitions(generateDailyChallenges(getTodayDateString()));
    if (isAllChallengesCompleted(s) && !s.perfectDayClaimed) {
      setShowPerfect(true);
    }
  }, []);

  const perfectBonus = getPerfectDayBonus();
  const completedCount = state?.challenges.filter((c) => c.completed).length ?? 0;

  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">

        {/* Header */}
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Daily</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("challenges.title") || "오늘의 챌린지"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("challenges.subtitle") || "매일 3개 챌린지 완료 → Perfect Day 보상"}
          </p>
        </header>

        {/* Progress summary */}
        {state && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">
                {t("challenges.progress") || "오늘 진행"}
              </span>
              <span className={`text-sm font-semibold ${completedCount === 3 ? "text-amber-300" : "text-white/60"}`}>
                {completedCount} / 3
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400"
                animate={{ width: `${(completedCount / 3) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            {completedCount === 3 && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-amber-300/80 text-center"
              >
                {t("challenges.perfectDay") || "🎁 완벽한 하루! 보상을 받을 수 있어요"}
              </motion.p>
            )}
          </div>
        )}

        {/* Challenge cards */}
        <div className="space-y-3">
          {definitions.map((def, i) => {
            const progress = state?.challenges.find((c) => c.id === def.id);
            const completed = progress?.completed ?? false;
            const cfg = DIFFICULTY_CONFIG[def.difficulty];

            return (
              <motion.div
                key={def.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`relative overflow-hidden rounded-[1.5rem] border p-5 transition-all ${cfg.bg} ${completed ? "opacity-70" : ""} shadow-lg ${cfg.glow}`}
              >
                {completed && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-black/30 backdrop-blur-sm z-10">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-4xl"
                    >✅</motion.span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="text-2xl">{def.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-white">
                        {def.label.ko}
                      </h3>
                      <span className={`text-xs font-medium ${cfg.color} uppercase tracking-wide`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-white/60">{def.description.ko}</p>

                    {/* Progress bar */}
                    {progress && progress.target > 1 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-white/40 mb-1">
                          <span>{progress.progress} / {progress.target}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-white/40"
                            animate={{ width: `${Math.min(100, (progress.progress / progress.target) * 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reward */}
                <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
                  <span>🪙 {def.reward.coins}</span>
                  {def.reward.evolution_points && <span>🧬 +{def.reward.evolution_points} EP</span>}
                  {def.reward.emoji_dust && <span>✨ +{def.reward.emoji_dust}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Perfect Day bonus info */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-sm font-medium text-amber-200">
            {t("challenges.perfectDayTitle") || "Perfect Day 보상"}
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-sm text-white/60">
            <span>🪙 +{perfectBonus.coins}</span>
            <span>🧬 +{perfectBonus.evolution_points} EP</span>
            <span>✨ +{perfectBonus.emoji_dust}</span>
          </div>
          <p className="mt-1.5 text-xs text-white/30">
            {t("challenges.resetNote") || "챌린지는 매일 자정에 초기화됩니다"}
          </p>
        </div>

        {/* Perfect Day modal */}
        <AnimatePresence>
          {showPerfect && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                className="w-full max-w-sm rounded-[2rem] border border-amber-400/30 bg-black/90 p-8 text-center shadow-[0_0_80px_rgba(251,191,36,0.2)]"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.8, repeat: 2 }}
                  className="text-5xl mb-4"
                >🎁</motion.div>
                <h2 className="text-xl font-bold text-amber-300">
                  {t("challenges.perfectDayTitle") || "완벽한 하루!"}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {t("challenges.perfectDayBody") || "모든 챌린지 완료! 보상이 지급됩니다."}
                </p>
                <div className="mt-4 flex justify-center gap-4 text-base text-white/80">
                  <span>🪙 +{perfectBonus.coins}</span>
                  <span>🧬 +{perfectBonus.evolution_points}</span>
                  <span>✨ +{perfectBonus.emoji_dust}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { haptic("success"); setShowPerfect(false); }}
                  className="mt-6 rounded-full bg-amber-400 px-8 py-2.5 text-sm font-bold text-black hover:bg-amber-300 transition-colors"
                >
                  {t("common.claim") || "받기"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
