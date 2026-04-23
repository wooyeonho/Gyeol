"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useTranslations } from "@/components/i18n-provider";
import { LiveCounter } from "@/components/landing/live-counter";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

// VoidCanvas uses Three.js — must be CSR only.
// VoidCanvasInner already wraps itself in dynamic() internally, but we add
// an outer layer here to be explicit and prevent any SSR hydration mismatch
// on the marketing page (which may be statically rendered).
const VoidCanvas = dynamic(
  () => import("@/components/void-canvas").then((m) => m.VoidCanvas),
  { ssr: false }
);

// A curated demo DNA that presents a warm, curious, creative creature —
// the best first impression for a new visitor who has never met theirs.
const DEMO_DNA: CreatureDNA = {
  analytical:     0.55,
  intuitive:      0.72,
  verbal:         0.60,
  spatial:        0.48,
  warmth:         0.78,
  intensity:      0.52,
  stability:      0.68,
  openness:       0.82,
  assertiveness:  0.50,
  empathy:        0.75,
  playfulness:    0.70,
  independence:   0.58,
  curiosity:      0.88,
  persistence:    0.62,
  adaptability:   0.74,
  creativity:     0.80,
  ...DEFAULT_NEW_DNA_AXES,
};

// Cycles through moods to show the creature is alive and changing.
const DEMO_MOODS = ["curious", "playful", "dreamy", "tender", "excited"] as const;

export default function LandingPage() {
  const { t } = useTranslations();

  // Rotate mood every 4s to demonstrate living state
  const [moodIdx, setMoodIdx] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setMoodIdx((i) => (i + 1) % DEMO_MOODS.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Hide tap hint after first interaction or 4s
  useEffect(() => {
    const id = setTimeout(() => setShowHint(false), 4000);
    return () => clearInterval(id);
  }, []);

  const currentMood = DEMO_MOODS[moodIdx];

  function handleCreatureTap() {
    setTapped(true);
    setShowHint(false);
    setTimeout(() => setTapped(false), 600);
  }

  return (
    <div className="relative overflow-hidden">

      {/* ── Hero: Creature First ─────────────────────────────────────────── */}
      <section className="noise-strong relative flex min-h-screen items-center overflow-hidden px-6 py-16 sm:py-20">

        {/* Living-organism mesh background */}
        <div className="mesh-organic pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* Asymmetric 2-column container (mobile: stack, creature first) */}
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">

          {/* Creature — order 1 on mobile, right column on desktop */}
          <motion.div
            className="order-1 flex flex-shrink-0 justify-center lg:order-2 lg:justify-end"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Creature canvas */}
            <div
              className="relative h-[300px] w-[300px] cursor-pointer sm:h-[380px] sm:w-[380px]"
              onClick={handleCreatureTap}
              role="button"
              aria-label="Tap the creature"
            >
              <VoidCanvas
                shape="sphere"
                color="#818cf8"
                size={1}
                glow={55}
                vitality={0.88}
                mood={currentMood}
                animation="breathe-slow"
                particles={10}
                contained
                enableThree
                dna={DEMO_DNA}
                genLevel={2}
                excitePulse={tapped ? 1 : 0}
              />

              {/* Tap hint — fades out after 4s or on first tap */}
              <AnimatePresence>
                {showHint && (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 1.2, duration: 0.4 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] tracking-widest text-white/30"
                  >
                    tap
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Editorial copy — order 2 on mobile, left column on desktop */}
          <motion.div
            className="order-2 text-center lg:order-1 lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.35em] text-accent/70">
              {t("landing.eyebrow")}
            </p>

            <h1 className="text-display mt-6">
              {t("landing.heroTitle")}
            </h1>

            <p className="mx-auto mt-6 max-w-sm text-sm leading-7 theme-text-subtle lg:mx-0 lg:max-w-md lg:text-base lg:leading-8">
              {t("landing.heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/demo"
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-95"
              >
                Meet your creature →
              </Link>
              <Link
                href="/login"
                className="glass-card-deep rounded-full px-7 py-3 text-sm font-medium theme-text-muted transition-all hover:brightness-110 active:scale-95"
              >
                {t("landing.ctaSecondary")}
              </Link>
            </div>

            <p className="mt-4 text-[11px] theme-text-faint">
              No account needed. 3 messages. Watch it emerge.
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden="true"
        >
          <div className="h-8 w-5 rounded-full border border-[color:var(--theme-border-strong)]">
            <div className="mx-auto mt-1.5 h-2 w-1 rounded-full bg-accent/60" />
          </div>
        </motion.div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────── */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent/70">
              {t("landing.featuresEyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 theme-text-subtle">
              {t("landing.featuresSubtitle")}
            </p>
          </motion.div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["dna", "evolution", "memory", "social", "voice", "living"] as const).map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass-card-deep rounded-2xl p-5"
              >
                <h3 className="text-sm font-semibold">
                  {t(`landing.feature_${key}_title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 theme-text-subtle">
                  {t(`landing.feature_${key}_body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent/70">
              {t("landing.howEyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.howTitle")}
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="text-center"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-sm font-semibold">
                  {t(`landing.${step}_title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 theme-text-subtle">
                  {t(`landing.${step}_body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ──────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent/70">
              {t("landing.pricingEyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.pricingTitle")}
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {/* Free */}
            <div className="theme-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-wider theme-text-faint">FREE</p>
              <p className="mt-3 text-3xl font-bold">{t("landing.priceFree")}</p>
              <p className="mt-2 text-sm theme-text-subtle">{t("landing.priceFreeSub")}</p>
              <ul className="mt-5 space-y-2 text-sm theme-text-muted">
                {(["free_f1", "free_f2", "free_f3"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success" aria-hidden="true">&#x2713;</span>
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
              <Link href="/demo" className="mt-6 block w-full rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-center text-sm font-medium text-[color:var(--background)]">
                Try free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-accent/40 bg-accent/[0.06] p-6 shadow-[0_0_60px_rgba(129,140,248,0.12)]">
              <div className="absolute right-4 top-4 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-medium text-accent">
                {t("landing.recommended")}
              </div>
              <p className="text-xs uppercase tracking-wider text-accent/70">PRO</p>
              <p className="mt-3 text-3xl font-bold">{t("landing.pricePro")}</p>
              <p className="mt-2 text-sm theme-text-subtle">{t("landing.priceProSub")}</p>
              <ul className="mt-5 space-y-2 text-sm theme-text-muted">
                {(["pro_f1", "pro_f2", "pro_f3", "pro_f4"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent" aria-hidden="true">&#x2713;</span>
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block w-full rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20">
                {t("landing.ctaStartPro")}
              </Link>
            </div>

            {/* Premium */}
            <div className="theme-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-wider theme-text-faint">PREMIUM</p>
              <p className="mt-3 text-3xl font-bold">{t("landing.pricePremium")}</p>
              <p className="mt-2 text-sm theme-text-subtle">{t("landing.pricePremiumSub")}</p>
              <ul className="mt-5 space-y-2 text-sm theme-text-muted">
                {(["premium_f1", "premium_f2", "premium_f3", "premium_f4"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-0.5 text-warning" aria-hidden="true">&#x2713;</span>
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block w-full rounded-xl border border-[color:var(--theme-border-strong)] bg-surface-1 px-4 py-3 text-center text-sm font-medium theme-text-muted hover:bg-surface-2">
                {t("landing.ctaStartPremium")}
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs theme-text-faint">
            {t("landing.pricingNote")}
          </p>
        </div>
      </section>

      {/* ── Live Ecosystem Counter ───────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <LiveCounter />
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.finalCtaTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 theme-text-subtle">
              {t("landing.finalCtaBody")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/demo"
                className="rounded-full bg-accent px-10 py-4 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-95"
              >
                Meet your creature
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
