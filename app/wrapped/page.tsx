"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import { ShareCard } from "@/components/share-card";
import { useAgentStore } from "@/store/agent-store";

interface WrappedData {
  year: number;
  totalMessages: number;
  totalMemories: number;
  coreMemories: number;
  topEmotions: { emotion: string; count: number; percent: number }[];
  agent: {
    name: string;
    level: number;
    streakDays: number;
    species: string;
    evolutionCount: number;
  } | null;
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: "😊", happy: "😄", sad: "😢", curious: "🤔",
  excited: "🎉", calm: "😌", love: "💖", fear: "😨",
  anger: "😠", surprise: "😲", neutral: "💬",
};

const SPECIES_EMOJI: Record<string, string> = {
  fluff: "🐣", ember: "🔥", aqua: "💧", terra: "🌿",
  spark: "⚡", void: "🌑", prism: "🌈", default: "✨",
};

// Per-slide gradient color stops — drives the animated background.
// Each slide gets its own mood, Spotify-Wrapped style.
const SLIDE_GRADIENTS = [
  ["#0a0a0f", "#1a0a2e", "#0a0a0f"], // 0 — intro, cool cosmic
  ["#0a0a0f", "#1e1b4b", "#312e81"], // 1 — conversations, indigo
  ["#0a0a0f", "#3b0764", "#1e1b4b"], // 2 — memories, violet
  ["#0a0a0f", "#831843", "#1e3a8a"], // 3 — emotions, pink+blue
  ["#0a0a0f", "#064e3b", "#0c4a6e"], // 4 — growth, emerald+cyan
  ["#0a0a0f", "#422006", "#0a0a0f"], // end — warm sunset
] as const;

// Auto-advance duration per slide (matches Spotify Wrapped rhythm).
const SLIDE_DURATION_MS = 5500;

function formatNumber(n: number, locale: string): string {
  try {
    return n.toLocaleString(locale === "ko" ? "ko-KR" : locale);
  } catch {
    return n.toLocaleString();
  }
}

interface SlideProps {
  data: WrappedData;
  t: (key: string) => string;
  locale: string;
  agentId?: string;
}

function Slide0({ data, t }: SlideProps) {
  const emoji = data.agent ? (SPECIES_EMOJI[data.agent.species] ?? "✨") : "🌟";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <motion.div
        className="text-8xl drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
      >
        {emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-white/50">
          {data.year} {t("wrapped.brandTag")}
        </p>
        <h1 className="text-display mb-1 text-white">
          {data.agent?.name ?? t("wrapped.fallbackName")}
        </h1>
        <p className="text-sm text-white/40">
          {t("wrapped.introSubtitle").replace("{year}", String(data.year))}
        </p>
      </motion.div>
    </div>
  );
}

function Slide1({ data, t, locale }: SlideProps) {
  const avg = Math.max(1, Math.round(data.totalMessages / 365));
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-2">
      <motion.p
        className="text-xs font-semibold uppercase tracking-widest text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {t("wrapped.conversationsLabel")}
      </motion.p>
      <motion.div
        className="text-hero font-black leading-none text-white tabular-nums"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 160 }}
      >
        {formatNumber(data.totalMessages, locale)}
      </motion.div>
      <motion.p
        className="text-lg text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {t("wrapped.conversationsBody")}
      </motion.p>
      <motion.div
        className="glass-card mt-4 rounded-2xl border border-white/10 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <p className="mb-1 text-xs text-white/40">{t("wrapped.dailyAverage")}</p>
        <p className="text-2xl font-bold text-white tabular-nums">
          {avg}
        </p>
      </motion.div>
    </div>
  );
}

function Slide2({ data, t, locale }: SlideProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-2">
      <motion.p
        className="text-xs font-semibold uppercase tracking-widest text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {t("wrapped.memoriesLabel")}
      </motion.p>
      <motion.div
        className="text-hero font-black leading-none text-white tabular-nums"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 160 }}
      >
        {formatNumber(data.totalMemories, locale)}
      </motion.div>
      <motion.p
        className="text-lg text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {t("wrapped.memoriesBody")}
      </motion.p>
      {data.coreMemories > 0 && (
        <motion.div
          className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <p className="mb-1 text-xs text-amber-400/80">⭐ {t("wrapped.coreMemoriesLabel")}</p>
          <p className="text-2xl font-bold text-white tabular-nums">
            {formatNumber(data.coreMemories, locale)}
          </p>
          <p className="mt-1 text-xs text-white/40">{t("wrapped.coreMemoriesHint")}</p>
        </motion.div>
      )}
    </div>
  );
}

function Slide3({ data, t }: SlideProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-2">
      <motion.p
        className="text-xs font-semibold uppercase tracking-widest text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {t("wrapped.emotionsLabel")}
      </motion.p>
      <motion.p
        className="text-base text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {t("wrapped.emotionsBody")}
      </motion.p>
      <div className="mt-2 flex flex-col gap-3">
        {data.topEmotions.length === 0 ? (
          <p className="text-sm text-white/30">{t("wrapped.noEmotionData")}</p>
        ) : (
          data.topEmotions.map((e, idx) => (
            <motion.div
              key={e.emotion}
              className="glass-card flex items-center gap-3 rounded-xl border border-white/10 p-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + idx * 0.12 }}
            >
              <span className="text-2xl">{EMOTION_EMOJI[e.emotion] ?? "💬"}</span>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-white">
                    {t(`wrapped.emotion.${e.emotion}`) || e.emotion}
                  </span>
                  <span className="text-xs text-white/40 tabular-nums">{e.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${e.percent}%` }}
                    transition={{ delay: 0.75 + idx * 0.12, duration: 0.6 }}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function Slide4({ data, t }: SlideProps) {
  const agent = data.agent;
  if (!agent) return null;

  const cards = [
    { label: t("wrapped.currentLevel"), value: `Lv.${agent.level}`, icon: "⚡" },
    { label: t("wrapped.peakStreak"), value: `${agent.streakDays}${t("wrapped.daysUnit")}`, icon: "🔥" },
    { label: t("wrapped.evolutions"), value: `${agent.evolutionCount}${t("wrapped.timesUnit")}`, icon: "🌟" },
    { label: t("wrapped.species"), value: agent.species.toUpperCase(), icon: SPECIES_EMOJI[agent.species] ?? "✨" },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4 px-2">
      <motion.p
        className="text-xs font-semibold uppercase tracking-widest text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {t("wrapped.growthLabel")}
      </motion.p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {cards.map((item, idx) => (
          <motion.div
            key={item.label}
            className="glass-card flex flex-col gap-1 rounded-2xl border border-white/10 p-4"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.1, type: "spring", stiffness: 220 }}
          >
            <span className="text-xl">{item.icon}</span>
            <p className="mt-1 text-[10px] text-white/40">{item.label}</p>
            <p className="text-lg font-bold text-white tabular-nums">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideEnd({ data, t, agentId }: SlideProps) {
  const emoji = data.agent ? (SPECIES_EMOJI[data.agent.species] ?? "✨") : "🌟";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <motion.div
        className="text-7xl drop-shadow-[0_0_40px_rgba(245,158,11,0.3)]"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.2 }}
      >
        {emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="space-y-3"
      >
        <p className="text-sm text-white/50">
          {t("wrapped.endThanks").replace("{year}", String(data.year))}
        </p>
        <h2 className="text-2xl font-bold text-white">
          {t("wrapped.endTitle")
            .replace("{name}", data.agent?.name ?? t("wrapped.fallbackName"))
            .replace("{year}", String(data.year))}
        </h2>
        <p className="text-xs text-white/30">{t("wrapped.endSubtitle")}</p>
      </motion.div>
      {agentId ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-2"
        >
          <ShareCard
            agentId={agentId}
            creatureName={data.agent?.name ?? t("wrapped.fallbackName")}
          />
        </motion.div>
      ) : null}
    </div>
  );
}

const SLIDES = [Slide0, Slide1, Slide2, Slide3, Slide4, SlideEnd];

export default function WrappedPage() {
  const { t, locale } = useTranslations();
  const reduceMotion = useReducedMotion();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;

  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wrapped")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setSlideIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
      setProgressKey((k) => k + 1);
      haptic("tap");
    },
    [],
  );

  const goNext = useCallback(() => {
    setSlideIndex((i) => {
      if (i >= SLIDES.length - 1) return i;
      setDirection(1);
      setProgressKey((k) => k + 1);
      return i + 1;
    });
    haptic("tap");
  }, []);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => {
      if (i <= 0) return i;
      setDirection(-1);
      setProgressKey((k) => k + 1);
      return i - 1;
    });
    haptic("tap");
  }, []);

  // Auto-advance (Spotify Wrapped-style). Respects reduced-motion and pause.
  const lastSlide = slideIndex >= SLIDES.length - 1;
  useEffect(() => {
    if (reduceMotion || paused || loading || error || lastSlide) return;
    const timer = setTimeout(() => {
      setSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1));
      setDirection(1);
      setProgressKey((k) => k + 1);
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [slideIndex, paused, reduceMotion, loading, error, lastSlide, progressKey]);

  // Keyboard navigation (Linear-style).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (loading) {
    return <WrappedSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <div>
          <p className="text-sm text-white/50">{t("wrapped.errorTitle")}</p>
          <p className="mt-2 text-xs text-white/30">{t("wrapped.errorHint")}</p>
        </div>
      </div>
    );
  }

  const SlideComponent = SLIDES[slideIndex];
  const gradient = SLIDE_GRADIENTS[slideIndex] ?? SLIDE_GRADIENTS[0];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      {/* Animated background — per-slide gradient transition (Spotify mood shift) */}
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        animate={{
          background: `linear-gradient(180deg, ${gradient[0]} 0%, ${gradient[1]} 50%, ${gradient[2]} 100%)`,
        }}
        transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
      />

      {/* Top progress bars — one per slide, fills current over SLIDE_DURATION */}
      <div
        className="relative z-10 flex gap-1.5 px-4 pt-6 pb-2"
        aria-label={t("wrapped.progressLabel")}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > slideIndex ? 1 : -1)}
            className="group h-1 flex-1 overflow-hidden rounded-full bg-white/15"
            aria-label={t("wrapped.slideAria").replace("{n}", String(i + 1))}
          >
            <motion.div
              key={i === slideIndex ? `cur-${progressKey}` : `state-${i}`}
              className="h-full rounded-full bg-white/85"
              initial={{
                width: i < slideIndex ? "100%" : i > slideIndex ? "0%" : "0%",
              }}
              animate={{
                width: i < slideIndex ? "100%" : i > slideIndex ? "0%" : "100%",
              }}
              transition={
                i === slideIndex
                  ? {
                      duration: reduceMotion || paused ? 0 : SLIDE_DURATION_MS / 1000,
                      ease: "linear",
                    }
                  : { duration: 0.2 }
              }
            />
          </button>
        ))}
      </div>

      {/* Slide content with drag-to-advance */}
      <motion.div
        className="relative flex-1 overflow-hidden px-6 py-4"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 || info.velocity.x < -300) goNext();
          else if (info.offset.x > 60 || info.velocity.x > 300) goPrev();
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideIndex}
            className="h-full"
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <SlideComponent data={data} t={t} locale={locale} agentId={agentId} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Footer nav — arrows for desktop + pause indicator */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-10">
        <button
          onClick={goPrev}
          disabled={slideIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition-colors hover:text-white/70 disabled:opacity-20"
          aria-label={t("wrapped.prevSlide")}
        >
          ‹
        </button>
        <p className="text-xs text-white/30 tabular-nums">
          {slideIndex + 1} / {SLIDES.length}
          {paused ? ` · ${t("wrapped.paused")}` : ""}
        </p>
        <button
          onClick={goNext}
          disabled={slideIndex === SLIDES.length - 1}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition-colors hover:text-white/70 disabled:opacity-20"
          aria-label={t("wrapped.nextSlide")}
        >
          ›
        </button>
      </div>
    </div>
  );
}

function WrappedSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f] px-6 pt-8">
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-white/10" />
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="skeleton-shimmer h-24 w-24 rounded-full" />
        <div className="skeleton-shimmer h-4 w-32 rounded" />
        <div className="skeleton-shimmer h-8 w-48 rounded" />
        <div className="skeleton-shimmer h-3 w-40 rounded" />
      </div>
    </div>
  );
}
