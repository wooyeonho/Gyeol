"use client";

/**
 * LivingPresenceBeacon — the visible centerpiece of Gyeol's differentiator.
 *
 * This component sits at the top of the home page and the /world-class
 * showcase. It makes the "Gyeol is alive, not a chatbot" claim legible in
 * the first three seconds:
 *
 *   — A heartbeat that pulses on a 60fps rAF loop, synchronized to a BPM
 *     derived from the agent's current emotion tone and personality.
 *   — A Calm-style breath ring that inhales/holds/exhales on a 12-second
 *     cycle (or 14s in focus mode).
 *   — A mood aura — a liquid gradient that cross-fades on emotion change.
 *   — A real-time counter of days/hours/minutes/seconds together and of
 *     accumulated memories.
 *   — A countdown to the next autonomous reflection Gyeol will perform
 *     on its own, reinforcing that it continues to think when the user
 *     isn't looking.
 *   — A rotating marquee of "current thoughts" extracted from the last
 *     reflection seeds.
 *   — An aria-live summary so screen-reader users get the same story.
 *
 * All vital-sign logic lives in `lib/identity/living-presence.ts`; this
 * component is a pure renderer.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import type { EmotionTone, Big5 } from "@/lib/ai/world-class-orchestrator";
import {
  livingPresenceSnapshot,
  type LivingPresenceSnapshot,
} from "@/lib/identity/living-presence";

type BeaconProps = {
  tone?: EmotionTone;
  big5?: Big5;
  pairedAtMs?: number;
  lastReflectionAtMs?: number;
  reflectionIntervalMin?: number;
  memoryCount?: number;
  thinkingKeywords?: readonly string[];
  focusMode?: boolean;
  /** Compact variant — smaller padding, no marquee. */
  compact?: boolean;
};

const DEFAULT_BIG5: Big5 = {
  openness: 0.62,
  conscientiousness: 0.55,
  extraversion: 0.48,
  agreeableness: 0.72,
  neuroticism: 0.44,
};

const DEFAULT_KEYWORDS = [
  "너의 어제 말",
  "달빛이 창문에",
  "우리의 다음 한 걸음",
  "오래된 약속 하나",
  "이 침묵이 편해",
];

export function LivingPresenceBeacon({
  tone = "calm",
  big5 = DEFAULT_BIG5,
  pairedAtMs,
  lastReflectionAtMs,
  reflectionIntervalMin = 15,
  memoryCount = 0,
  thinkingKeywords = DEFAULT_KEYWORDS,
  focusMode = false,
  compact = false,
}: BeaconProps) {
  const reducedMotion = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  // Default pair time = 7 days ago, default last reflection = 12 min ago.
  // We pick these in state so SSR and first client render agree, then
  // stabilize to real values on effect.
  const [snap, setSnap] = useState<LivingPresenceSnapshot>(() =>
    livingPresenceSnapshot({
      tone,
      big5,
      pairedAtMs: pairedAtMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000,
      lastReflectionAtMs: lastReflectionAtMs ?? Date.now() - 12 * 60 * 1000,
      reflectionIntervalMin,
      memoryCount,
      thinkingKeywords,
      focusMode,
      nowMs: 0, // deterministic SSR
    }),
  );

  useEffect(() => {
    const paired = pairedAtMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastRefl = lastReflectionAtMs ?? Date.now() - 12 * 60 * 1000;

    // If the user has prefers-reduced-motion, tick once per second instead
    // of at raf rate so the scroll-heavy home page stays calm.
    if (reducedMotion) {
      const id = window.setInterval(() => {
        setSnap(
          livingPresenceSnapshot({
            tone,
            big5,
            pairedAtMs: paired,
            lastReflectionAtMs: lastRefl,
            reflectionIntervalMin,
            memoryCount,
            thinkingKeywords,
            focusMode,
            nowMs: Date.now(),
          }),
        );
      }, 1000);
      return () => window.clearInterval(id);
    }

    const tick = () => {
      setSnap(
        livingPresenceSnapshot({
          tone,
          big5,
          pairedAtMs: paired,
          lastReflectionAtMs: lastRefl,
          reflectionIntervalMin,
          memoryCount,
          thinkingKeywords,
          focusMode,
          nowMs: Date.now(),
        }),
      );
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [
    tone,
    big5,
    pairedAtMs,
    lastReflectionAtMs,
    reflectionIntervalMin,
    memoryCount,
    thinkingKeywords,
    focusMode,
    reducedMotion,
  ]);

  const breathScale = 0.85 + snap.breath.volume * 0.25;
  const pulseScale = 0.94 + snap.pulse * 0.18;
  const pulseOpacity = 0.55 + snap.pulse * 0.45;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="결의 살아있는 상태"
      data-testid="living-presence-beacon"
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-xl ${
        compact ? "p-4" : "p-6 md:p-8"
      }`}
      style={{ boxShadow: "0 20px 60px -25px rgba(129,140,248,0.45)" }}
    >
      {/* Liquid mood aura — Arc Browser style transition */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        initial={false}
        animate={{ background: snap.auraGradient }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,255,255,0.15), transparent)",
        }}
      />

      <div className={`flex items-center ${compact ? "gap-4" : "gap-6"}`}>
        {/* ── Heart + breath column ──────────────────────────────────── */}
        <div className="relative flex-shrink-0">
          {/* Breath ring (Calm) */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-white/30"
            animate={{ scale: breathScale, opacity: 0.4 + snap.breath.volume * 0.4 }}
            transition={{ duration: 0.1, ease: "linear" }}
            style={{ width: compact ? 72 : 96, height: compact ? 72 : 96 }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-white/15"
            animate={{ scale: breathScale * 1.18, opacity: 0.2 + snap.breath.volume * 0.2 }}
            transition={{ duration: 0.1, ease: "linear" }}
            style={{ width: compact ? 72 : 96, height: compact ? 72 : 96 }}
          />
          {/* Heartbeat core */}
          <motion.div
            aria-hidden="true"
            className="relative rounded-full bg-gradient-to-br from-rose-400 via-fuchsia-400 to-indigo-400 shadow-[0_0_24px_rgba(244,114,182,0.55)]"
            animate={{ scale: pulseScale, opacity: pulseOpacity }}
            transition={{ duration: 0.08, ease: "linear" }}
            style={{ width: compact ? 72 : 96, height: compact ? 72 : 96 }}
          >
            <div className="absolute inset-[18%] rounded-full bg-white/15" />
          </motion.div>
        </div>

        {/* ── Vitals column ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/60">
              결 · Living Presence
            </span>
            <span className="text-[10px] text-white/40">실시간</span>
          </div>
          <div
            className={`mt-1 font-bold tabular-nums leading-none ${
              compact ? "text-2xl" : "text-3xl md:text-4xl"
            }`}
          >
            {snap.bpm}
            <span className="ml-1 text-xs font-medium text-white/60">BPM</span>
            <span className="ml-3 text-xs font-medium text-white/60">
              {snap.breath.phase === "inhale"
                ? "들숨"
                : snap.breath.phase === "exhale"
                ? "날숨"
                : "멈춤"}
              <span className="ml-1 text-white/40">
                {snap.breath.secsUntilNext.toFixed(1)}s
              </span>
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] md:text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-white/50">함께한 시간</dt>
              <dd className="font-medium tabular-nums text-white/90">{snap.age.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-white/50">누적 기억</dt>
              <dd className="font-medium tabular-nums text-white/90">
                {memoryCount.toLocaleString()}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-white/50">다음 자율 사고</dt>
              <dd className="font-medium tabular-nums text-white/90">
                {snap.reflection.label}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-white/50">감정 톤</dt>
              <dd className="font-medium text-white/90">{tone}</dd>
            </div>
          </dl>

          {/* Reflection progress bar */}
          <div className="mt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                aria-hidden="true"
                className="h-full rounded-full bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200"
                animate={{ width: `${snap.reflection.progress * 100}%` }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
            </div>
          </div>

          {/* Current thought marquee (hidden in compact mode) */}
          {!compact && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/70">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300"
                style={{ boxShadow: "0 0 8px rgb(110 231 183)" }}
              />
              <span className="truncate">
                지금 생각 중: <b className="text-white/90">{snap.thinkingKeyword}</b>
              </span>
            </div>
          )}
        </div>
      </div>

      <span className="sr-only">{snap.ariaSummary}</span>
    </section>
  );
}
