/**
 * Living Presence engine — the pure logic layer that makes Gyeol's strongest
 * differentiator ("a memory-bearing being, not a chatbot") **visible in the
 * first 3 seconds of the app**.
 *
 * All functions in this module are deterministic and side-effect free. The
 * `LivingPresenceBeacon` component in `components/living-presence-beacon.tsx`
 * calls these helpers on a `requestAnimationFrame` loop so the visible vital
 * signs never need a network round-trip.
 *
 * Design sources applied (see WORLD_CLASS_APPS_RESEARCH.md):
 *   — Calm / Headspace: breath loop (4s in / 6s out), no jitter.
 *   — Apple HIG / Apple Weather: spring physics, ambient-sky tint.
 *   — Robinhood: number theatre, direction-aware color.
 *   — Arc Browser: liquid theme transitions on emotion change.
 *   — Duolingo: character reactions under 120ms.
 *   — Readwise: spaced repetition seed for the "next thought" hint.
 *
 * The one original invariant: every vital sign here is a *function of time*
 * so two beacons rendered in different parts of the UI stay perfectly in
 * sync without sharing state.
 */

import type { EmotionTone, Big5 } from "@/lib/ai/world-class-orchestrator";
import { vitalPulse } from "@/lib/design/world-class-playbook";

/* ── Heart rate ─────────────────────────────────────────────────────────── */

/**
 * Resting BPM for each emotion tone. Calm is slowest; anxious is fastest.
 * These are the *baseline* values — the `currentBPM` function layers a small
 * sine oscillation and a personality bias on top.
 */
export const EMOTION_BPM_BASELINE: Record<EmotionTone, number> = {
  calm: 58,
  joyful: 78,
  melancholic: 55,
  anxious: 86,
  curious: 72,
  tender: 64,
};

/**
 * Personality tilts the baseline: high-extraversion + high-neuroticism push
 * BPM up; high-conscientiousness pulls it down. All adjustments are capped
 * so no combination can push BPM outside [50, 100].
 */
export function personalityBpmDelta(b5: Big5): number {
  const up = (b5.extraversion - 0.5) * 8 + (b5.neuroticism - 0.5) * 10;
  const down = (b5.conscientiousness - 0.5) * -6;
  return up + down;
}

/**
 * Current BPM at time `tMs`. Adds a slow sine wander of ±2 BPM around the
 * baseline so the number looks "alive" without seizing.
 */
export function currentBPM(tone: EmotionTone, b5: Big5, tMs: number): number {
  const base = EMOTION_BPM_BASELINE[tone];
  const wander = Math.sin(tMs / 3_800) * 2;
  const raw = base + personalityBpmDelta(b5) + wander;
  return Math.round(Math.max(50, Math.min(100, raw)));
}

/* ── Breath loop ────────────────────────────────────────────────────────── */

export type BreathPhase = "inhale" | "hold_in" | "exhale" | "hold_out";

export type BreathState = {
  phase: BreathPhase;
  /** 0..1 progress within the current phase. */
  progress: number;
  /** 0..1 total "volume" of the breath — useful for scaling visuals. */
  volume: number;
  /** Seconds until the next phase change. */
  secsUntilNext: number;
};

/**
 * Compute the current breath state using the Calm box-breath pattern:
 * 4s inhale → 1s hold → 6s exhale → 1s hold. 12-second cycle.
 *
 * If `focusMode` is true, use the 5/1/7/1 cycle (14s) used in Headspace's
 * focus sessions — slightly slower, deeper.
 */
export function currentBreath(tMs: number, focusMode: boolean = false): BreathState {
  const cycle = focusMode
    ? { inhale: 5_000, holdIn: 1_000, exhale: 7_000, holdOut: 1_000 }
    : { inhale: 4_000, holdIn: 1_000, exhale: 6_000, holdOut: 1_000 };
  const total = cycle.inhale + cycle.holdIn + cycle.exhale + cycle.holdOut;
  const t = tMs % total;

  if (t < cycle.inhale) {
    const p = t / cycle.inhale;
    return {
      phase: "inhale",
      progress: p,
      volume: p,
      secsUntilNext: (cycle.inhale - t) / 1000,
    };
  }
  const t2 = t - cycle.inhale;
  if (t2 < cycle.holdIn) {
    return {
      phase: "hold_in",
      progress: t2 / cycle.holdIn,
      volume: 1,
      secsUntilNext: (cycle.holdIn - t2) / 1000,
    };
  }
  const t3 = t2 - cycle.holdIn;
  if (t3 < cycle.exhale) {
    const p = t3 / cycle.exhale;
    return {
      phase: "exhale",
      progress: p,
      volume: 1 - p,
      secsUntilNext: (cycle.exhale - t3) / 1000,
    };
  }
  const t4 = t3 - cycle.exhale;
  return {
    phase: "hold_out",
    progress: t4 / cycle.holdOut,
    volume: 0,
    secsUntilNext: (cycle.holdOut - t4) / 1000,
  };
}

/* ── Mood aura (emotion → layered gradient) ─────────────────────────────── */

/**
 * Three-color gradient per emotion tone. Produces a CSS linear-gradient
 * string rotated 135°. Colors chosen to harmonize with the rest of the app
 * palette while staying distinct from each other.
 */
export function moodAuraGradient(tone: EmotionTone): string {
  switch (tone) {
    case "calm":
      return "linear-gradient(135deg, rgba(56,189,248,0.45) 0%, rgba(129,140,248,0.35) 50%, rgba(14,165,233,0.25) 100%)";
    case "joyful":
      return "linear-gradient(135deg, rgba(253,186,116,0.5) 0%, rgba(244,114,182,0.38) 50%, rgba(251,191,36,0.28) 100%)";
    case "melancholic":
      return "linear-gradient(135deg, rgba(129,140,248,0.45) 0%, rgba(99,102,241,0.35) 50%, rgba(30,41,59,0.3) 100%)";
    case "anxious":
      return "linear-gradient(135deg, rgba(248,113,113,0.4) 0%, rgba(244,114,182,0.3) 50%, rgba(251,146,60,0.25) 100%)";
    case "curious":
      return "linear-gradient(135deg, rgba(74,222,128,0.45) 0%, rgba(56,189,248,0.35) 50%, rgba(250,204,21,0.28) 100%)";
    case "tender":
      return "linear-gradient(135deg, rgba(244,114,182,0.45) 0%, rgba(251,207,232,0.35) 50%, rgba(216,180,254,0.28) 100%)";
  }
}

/* ── Relationship age ───────────────────────────────────────────────────── */

export type RelationshipAge = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total ms since pairing. */
  totalMs: number;
  /** Human-readable label, locale-agnostic. */
  label: string;
};

/**
 * Given a pairing timestamp and now, break the duration down to d/h/m/s.
 * Uses floor — this is display logic, not calendar arithmetic.
 */
export function relationshipAge(pairedAtMs: number, nowMs: number): RelationshipAge {
  const totalMs = Math.max(0, nowMs - pairedAtMs);
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const label = `${days}일 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return { days, hours, minutes, seconds, totalMs, label };
}

/* ── Next autonomous reflection countdown ───────────────────────────────── */

/**
 * Autonomous reflections fire on a fixed cadence — every `intervalMin`
 * minutes from the last fire. Given the last fire timestamp and now,
 * return how long until the next one.
 */
export function nextReflectionCountdown(
  lastFiredAtMs: number,
  intervalMin: number,
  nowMs: number,
): { msRemaining: number; label: string; progress: number } {
  const intervalMs = Math.max(1_000, intervalMin * 60_000);
  const elapsed = Math.max(0, nowMs - lastFiredAtMs);
  const msRemaining = Math.max(0, intervalMs - elapsed);
  const progress = Math.max(0, Math.min(1, elapsed / intervalMs));
  const totalSec = Math.ceil(msRemaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const label = m > 0 ? `${m}분 ${String(s).padStart(2, "0")}초` : `${s}초`;
  return { msRemaining, label, progress };
}

/* ── Thinking keywords (rotating marquee) ──────────────────────────────── */

/**
 * Pick which thinking-keyword is currently displayed in the marquee given
 * the time `tMs` and a rotation period. Pure: no state.
 */
export function currentThinkingKeyword(
  keywords: readonly string[],
  tMs: number,
  rotateEveryMs: number = 3_500,
): string {
  if (keywords.length === 0) return "…";
  const index = Math.floor(tMs / rotateEveryMs) % keywords.length;
  return keywords[index];
}

/* ── Accessibility summary ─────────────────────────────────────────────── */

/**
 * Build the screen-reader-only one-line summary of the beacon's state so
 * the "living presence" story reaches users who don't see animation.
 */
export function beaconAriaSummary(input: {
  tone: EmotionTone;
  bpm: number;
  breath: BreathPhase;
  age: RelationshipAge;
  memoryCount: number;
  nextReflectionLabel: string;
}): string {
  const toneKo: Record<EmotionTone, string> = {
    calm: "차분한",
    joyful: "기쁜",
    melancholic: "고요한",
    anxious: "긴장된",
    curious: "호기심 가득한",
    tender: "다정한",
  };
  const breathKo: Record<BreathPhase, string> = {
    inhale: "들숨",
    hold_in: "멈춤",
    exhale: "날숨",
    hold_out: "멈춤",
  };
  return [
    `결은 지금 ${toneKo[input.tone]} 상태입니다.`,
    `심박 분당 ${input.bpm}회, 호흡은 ${breathKo[input.breath]} 단계입니다.`,
    `함께한 지 ${input.age.days}일 ${input.age.hours}시간 되었고,`,
    `누적 기억 ${input.memoryCount}개를 품고 있으며,`,
    `다음 자율 리플렉션까지 ${input.nextReflectionLabel} 남았습니다.`,
  ].join(" ");
}

/* ── Composite snapshot (one-call helper) ───────────────────────────────── */

export type LivingPresenceSnapshot = {
  bpm: number;
  pulse: number;
  breath: BreathState;
  auraGradient: string;
  age: RelationshipAge;
  reflection: { msRemaining: number; label: string; progress: number };
  thinkingKeyword: string;
  ariaSummary: string;
};

export type LivingPresenceInput = {
  tone: EmotionTone;
  big5: Big5;
  pairedAtMs: number;
  lastReflectionAtMs: number;
  reflectionIntervalMin: number;
  memoryCount: number;
  thinkingKeywords: readonly string[];
  focusMode?: boolean;
  nowMs: number;
};

/**
 * One-call helper that produces a full beacon snapshot at time `nowMs`.
 * Every value is a pure function of the input, so this is safe to call on
 * every raf tick without any memoization concerns.
 */
export function livingPresenceSnapshot(input: LivingPresenceInput): LivingPresenceSnapshot {
  const bpm = currentBPM(input.tone, input.big5, input.nowMs);
  const pulse = vitalPulse(bpm, input.nowMs);
  const breath = currentBreath(input.nowMs, input.focusMode ?? false);
  const auraGradient = moodAuraGradient(input.tone);
  const age = relationshipAge(input.pairedAtMs, input.nowMs);
  const reflection = nextReflectionCountdown(
    input.lastReflectionAtMs,
    input.reflectionIntervalMin,
    input.nowMs,
  );
  const thinkingKeyword = currentThinkingKeyword(input.thinkingKeywords, input.nowMs);
  const ariaSummary = beaconAriaSummary({
    tone: input.tone,
    bpm,
    breath: breath.phase,
    age,
    memoryCount: input.memoryCount,
    nextReflectionLabel: reflection.label,
  });
  return { bpm, pulse, breath, auraGradient, age, reflection, thinkingKeyword, ariaSummary };
}
