"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { StreakFlame } from "@/components/streak-flame";

interface HomeHeroProps {
  streakDays: number;
  todayActive: boolean;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  genLevel: number;
  totalMessages: number;
  isNewUser: boolean;
}

/**
 * Duolingo-style home hero card. Large, always-visible streak + level
 * combo that anchors the home screen. When the user is new (zero data),
 * it renders an inviting empty state rather than a row of faded zeros.
 */
export function HomeHero({
  streakDays,
  todayActive,
  level,
  xpIntoLevel,
  xpForNext,
  genLevel,
  totalMessages,
  isNewUser,
}: HomeHeroProps) {
  const { t } = useTranslations();
  const xpPct = Math.max(
    2,
    Math.min(100, (xpIntoLevel / Math.max(1, xpForNext)) * 100),
  );
  const xpRemaining = Math.max(0, xpForNext - xpIntoLevel);
  const memoryCount = totalMessages;

  // Empty-state variant for brand-new users.
  if (isNewUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-cyan-500/10 px-4 py-4"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-center gap-3">
          <motion.div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/10 text-3xl"
            animate={{ rotate: [0, -6, 6, -3, 3, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
          >
            🔥
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">
              {t("homeHero.newUserEyebrow")}
            </p>
            <p className="mt-0.5 text-[15px] font-semibold text-white">
              {t("homeHero.newUserTitle")}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-white/70">
              {t("homeHero.newUserBody")}
            </p>
          </div>
        </div>
        {/* Progress-to-first-spark bar */}
        <div className="relative mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-cyan-300"
              initial={{ width: "0%" }}
              animate={{ width: "6%" }}
              transition={{ duration: 0.9, delay: 0.2 }}
            />
          </div>
          <span className="text-[10px] font-semibold text-amber-100/85">
            Lv 1 · 0 / {xpForNext || 50} XP
          </span>
        </div>
      </motion.div>
    );
  }

  // Standard variant — prominent, 3 columns of data.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent px-4 py-3.5 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        {/* ── Streak (left) ── */}
        <Link
          href="/achievements"
          className="flex shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-black/30 px-2.5 py-2 transition-all hover:border-amber-300/40 hover:bg-amber-500/10"
          aria-label={t("homeHero.streakAria").replace("{count}", String(streakDays))}
        >
          <StreakFlame
            days={streakDays}
            size="lg"
            showCount={false}
            atRisk={streakDays > 0 && !todayActive}
          />
          <motion.span
            key={streakDays}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-0.5 text-[18px] font-bold leading-none tabular-nums text-amber-200"
          >
            {streakDays}
          </motion.span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-white/50">
            {t("homeHero.streakLabel")}
          </span>
        </Link>

        {/* ── Level + XP (center, fills remaining space) ── */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                {t("homeHero.levelLabel")}
              </span>
              <motion.span
                key={level}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
                className="text-lg font-bold tabular-nums text-white"
              >
                {level}
              </motion.span>
            </div>
            <span className="text-[10px] tabular-nums text-white/55">
              {xpIntoLevel} / {xpForNext} XP
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="relative h-full rounded-full bg-gradient-to-r from-cyan-300 via-indigo-400 to-fuchsia-400"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-white/25 [mask-image:linear-gradient(90deg,transparent,white,transparent)]"
              />
            </motion.div>
          </div>
          <p className="mt-1 text-[10px] text-white/45">
            {t("homeHero.xpToNext").replace("{count}", String(xpRemaining))}
          </p>
        </div>

        {/* ── Gen + memory badge (right) ── */}
        <Link
          href="/memories"
          className="flex shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-black/30 px-2.5 py-2 transition-all hover:border-cyan-300/40 hover:bg-cyan-500/10"
          aria-label={t("homeHero.memoryAria").replace("{count}", String(memoryCount))}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 text-[11px] font-bold text-cyan-100">
            G{genLevel}
          </div>
          <span className="mt-1 text-[14px] font-bold tabular-nums text-white">
            {memoryCount}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/50">
            {t("homeHero.memoryLabel")}
          </span>
        </Link>
      </div>
    </motion.div>
  );
}
