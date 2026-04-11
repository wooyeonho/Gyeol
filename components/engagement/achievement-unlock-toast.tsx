"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AchievementDefinition, AchievementRarity } from "@/lib/engagement/achievements";

interface AchievementUnlockToastProps {
  achievement: AchievementDefinition | null;
  locale?: "ko" | "en" | "ja" | "zh" | "es";
  onDismiss: () => void;
}

// Deterministic confetti: 24 pieces fanned out in a radial spiral so we
// never need to call Math.random() during render.
const CONFETTI = Array.from({ length: 24 }).map((_, i) => {
  const angle = (i / 24) * Math.PI * 2 + Math.PI / 8;
  const radius = 160 + (i % 4) * 25;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
    rotate: (i * 37) % 360,
    duration: 1.3 + (i % 5) * 0.12,
    delay: (i % 8) * 0.03,
    hue: (30 + i * 17) % 360,
  };
});

const RARITY_STYLE: Record<
  AchievementRarity,
  { ring: string; glow: string; label: string; gradient: string }
> = {
  common: {
    ring: "border-white/25",
    glow: "shadow-[0_0_60px_rgba(255,255,255,0.2)]",
    label: "COMMON",
    gradient: "from-slate-800 via-slate-900 to-slate-950",
  },
  rare: {
    ring: "border-blue-300/50",
    glow: "shadow-[0_0_70px_rgba(59,130,246,0.45)]",
    label: "RARE",
    gradient: "from-slate-900 via-blue-950 to-indigo-950",
  },
  epic: {
    ring: "border-purple-300/60",
    glow: "shadow-[0_0_80px_rgba(168,85,247,0.55)]",
    label: "EPIC",
    gradient: "from-slate-900 via-purple-950 to-fuchsia-950",
  },
  legendary: {
    ring: "border-amber-300/70",
    glow: "shadow-[0_0_90px_rgba(251,191,36,0.6)]",
    label: "LEGENDARY",
    gradient: "from-amber-950 via-orange-950 to-rose-950",
  },
  mythic: {
    ring: "border-fuchsia-200/80",
    glow: "shadow-[0_0_110px_rgba(240,171,252,0.65)]",
    label: "MYTHIC",
    gradient: "from-fuchsia-950 via-rose-950 to-indigo-950",
  },
};

/**
 * Full-screen celebration banner when a new achievement is unlocked.
 * Consumed by any page that wants to surface freshly-awarded badges
 * (typically via /api/achievements response).
 */
export function AchievementUnlockToast({
  achievement,
  locale = "ko",
  onDismiss,
}: AchievementUnlockToastProps) {
  const style = achievement ? RARITY_STYLE[achievement.rarity] : null;
  return (
    <AnimatePresence>
      {achievement && style && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 24 }}
            className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border ${style.ring} bg-gradient-to-br ${style.gradient} p-8 text-center ${style.glow}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti ring */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              {CONFETTI.map((c, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-1 rounded-sm"
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: c.dx,
                    y: c.dy,
                    opacity: 0,
                    rotate: c.rotate,
                  }}
                  transition={{
                    duration: c.duration,
                    delay: c.delay,
                    repeat: Infinity,
                    repeatDelay: 1.8,
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                    background: `hsl(${c.hue}, 85%, 70%)`,
                  }}
                />
              ))}
            </div>

            <motion.p
              className="relative text-[10px] font-bold uppercase tracking-[0.35em] text-white/70"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
            >
              Achievement Unlocked
            </motion.p>
            <motion.p
              className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              style={{
                color:
                  achievement.rarity === "mythic"
                    ? "#f0abfc"
                    : achievement.rarity === "legendary"
                      ? "#fbbf24"
                      : achievement.rarity === "epic"
                        ? "#c4b5fd"
                        : achievement.rarity === "rare"
                          ? "#93c5fd"
                          : "#e5e7eb",
              }}
            >
              {style.label}
            </motion.p>

            <motion.div
              className="relative mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 text-6xl"
              initial={{ scale: 0.3, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 240 }}
              style={{
                boxShadow: "inset 0 0 40px rgba(255, 255, 255, 0.15)",
              }}
            >
              {achievement.icon}
            </motion.div>

            <motion.h3
              className="relative mt-5 text-2xl font-bold text-white"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {achievement.label[locale]}
            </motion.h3>
            <motion.p
              className="relative mt-2 text-sm text-white/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              {achievement.description[locale]}
            </motion.p>

            {(achievement.reward.coins ||
              achievement.reward.evolution_points ||
              achievement.reward.exclusive_title) && (
              <motion.div
                className="relative mt-4 flex flex-wrap items-center justify-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                {achievement.reward.coins ? (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
                    +{achievement.reward.coins} 🪙
                  </span>
                ) : null}
                {achievement.reward.evolution_points ? (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    +{achievement.reward.evolution_points} EP
                  </span>
                ) : null}
                {achievement.reward.exclusive_title ? (
                  <span className="rounded-full bg-fuchsia-400/15 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                    「{achievement.reward.exclusive_title}」
                  </span>
                ) : null}
              </motion.div>
            )}

            <motion.button
              type="button"
              className="relative mt-6 inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/15"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              onClick={onDismiss}
            >
              {locale === "ko" ? "계속하기" : "Continue"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
