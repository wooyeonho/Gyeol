"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { LiveCounter } from "@/components/landing/live-counter";

const FEATURES = [
  { icon: "dna", key: "dna" },
  { icon: "evolution", key: "evolution" },
  { icon: "memory", key: "memory" },
  { icon: "social", key: "social" },
  { icon: "voice", key: "voice" },
  { icon: "living", key: "living" },
] as const;

const FEATURE_ICONS: Record<string, string> = {
  dna: "\u{1F9EC}",
  evolution: "\u{1F331}",
  memory: "\u{1F9E0}",
  social: "\u{1F30D}",
  voice: "\u{1F3A4}",
  living: "\u{1F49B}",
};

export default function LandingPage() {
  const { t } = useTranslations();

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        {/* Background aurora */}
        <div className="aurora-flow pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 mx-auto max-w-3xl"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
            {t("landing.eyebrow")}
          </p>

          <h1 className="mt-6 text-display">
            {t("landing.heroTitle")}
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-7 theme-text-subtle sm:text-hero">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/demo"
              className="rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-95 btn-3d"
            >
              Try it — 2 minutes, no signup
            </Link>
            <Link
              href="/login"
              className="glass-card rounded-full px-8 py-3.5 text-sm font-medium theme-text-muted transition-all hover:brightness-110 active:scale-95 btn-3d"
            >
              {t("landing.ctaSecondary")}
            </Link>
          </div>

          <p className="mt-4 text-xs theme-text-faint">
            No account needed. Talk for 3 messages and watch your creature emerge.
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-8 w-5 rounded-full border border-[color:var(--theme-border-strong)]">
            <div className="mx-auto mt-1.5 h-2 w-1 rounded-full bg-accent/60" />
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-accent/70">
              {t("landing.featuresEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 theme-text-subtle">
              {t("landing.featuresSubtitle")}
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-card rounded-2xl p-5"
              >
                <span className="text-2xl" aria-hidden="true">
                  {FEATURE_ICONS[icon]}
                </span>
                <h3 className="mt-3 text-base font-semibold">
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

      {/* How It Works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-accent/70">
              {t("landing.howEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.howTitle")}
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-lg font-bold text-accent">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold">
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

      {/* Pricing Preview */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-accent/70">
              {t("landing.pricingEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.pricingTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 theme-text-subtle">
              {t("landing.pricingSubtitle")}
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {/* Free */}
            <div className="theme-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-wider theme-text-faint">FREE</p>
              <p className="mt-3 text-3xl font-bold">{t("landing.priceFree")}</p>
              <p className="mt-3 text-sm theme-text-subtle">{t("landing.priceFreeSub")}</p>
              <ul className="mt-5 space-y-2.5 text-sm theme-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-success" aria-hidden="true">&#x2713;</span>
                  {t("landing.free_f1")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-success" aria-hidden="true">&#x2713;</span>
                  {t("landing.free_f2")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-success" aria-hidden="true">&#x2713;</span>
                  {t("landing.free_f3")}
                </li>
              </ul>
              <Link
                href="/demo"
                className="mt-6 block w-full rounded-xl bg-[color:var(--foreground)] px-4 py-3 text-center text-sm font-medium text-[color:var(--background)]"
              >
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
              <p className="mt-3 text-sm theme-text-subtle">{t("landing.priceProSub")}</p>
              <ul className="mt-5 space-y-2.5 text-sm theme-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent" aria-hidden="true">&#x2713;</span>
                  {t("landing.pro_f1")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent" aria-hidden="true">&#x2713;</span>
                  {t("landing.pro_f2")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent" aria-hidden="true">&#x2713;</span>
                  {t("landing.pro_f3")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent" aria-hidden="true">&#x2713;</span>
                  {t("landing.pro_f4")}
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20"
              >
                {t("landing.ctaStartPro")}
              </Link>
            </div>

            {/* Premium */}
            <div className="theme-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-wider theme-text-faint">PREMIUM</p>
              <p className="mt-3 text-3xl font-bold">{t("landing.pricePremium")}</p>
              <p className="mt-3 text-sm theme-text-subtle">{t("landing.pricePremiumSub")}</p>
              <ul className="mt-5 space-y-2.5 text-sm theme-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-warning" aria-hidden="true">&#x2713;</span>
                  {t("landing.premium_f1")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-warning" aria-hidden="true">&#x2713;</span>
                  {t("landing.premium_f2")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-warning" aria-hidden="true">&#x2713;</span>
                  {t("landing.premium_f3")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-warning" aria-hidden="true">&#x2713;</span>
                  {t("landing.premium_f4")}
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-xl border border-[color:var(--theme-border-strong)] bg-surface-1 px-4 py-3 text-center text-sm font-medium theme-text-muted hover:bg-surface-2"
              >
                {t("landing.ctaStartPremium")}
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs theme-text-faint">
            {t("landing.pricingNote")}
          </p>
        </div>
      </section>

      {/* Live ecosystem counter — Instagram FOMO via real dashboard metrics */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <LiveCounter />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("landing.finalCtaTitle")}
            </h2>
            <p className="mt-4 text-base leading-7 theme-text-subtle">
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
