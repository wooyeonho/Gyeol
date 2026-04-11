/**
 * World-class wellness patterns — synthesized from 11+ top health apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.8):
 *   Apple Health/Fitness+, Strava, Whoop, Oura, MyFitnessPal, Headspace,
 *   Calm, Zero fasting, Finch, Peloton, Noom.
 *
 * Delivers the primitives: three-ring goals, breathing cadences, recovery
 * scoring, and gentle streak math.
 */

export type WellnessPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const WELLNESS_PRINCIPLES: readonly WellnessPrinciple[] = [
  {
    id: "three-ring",
    source: "Apple Health",
    rule: "Daily goals render as concentric rings; each ring can close independently.",
  },
  {
    id: "recovery-score",
    source: "Whoop",
    rule: "Recovery is a single 0–100 score computed daily from HRV + sleep + RHR.",
  },
  {
    id: "sleep-ring",
    source: "Oura",
    rule: "Sleep breaks down into stages + a single readiness number surfaces first.",
  },
  {
    id: "breath-ring",
    source: "Headspace",
    rule: "Breathing guides run at 4s inhale / 6s exhale; expose a slider to personalize.",
  },
  {
    id: "sleep-story",
    source: "Calm",
    rule: "Bedtime content is narrative, not metric — reduce pressure around bedtime.",
  },
  {
    id: "fasting-timer",
    source: "Zero",
    rule: "Fasting windows surface as a dial, not a countdown; emphasize progress not remaining.",
  },
  {
    id: "self-care-character",
    source: "Finch",
    rule: "Self-care is gamified through a pet that grows when you care for yourself.",
  },
  {
    id: "live-class",
    source: "Peloton",
    rule: "Live sessions show a leaderboard but allow opt-out for solo mood.",
  },
  {
    id: "psychological-coaching",
    source: "Noom",
    rule: "Habit nudges are framed as curious questions, not commands.",
  },
  {
    id: "barcode-input",
    source: "MyFitnessPal",
    rule: "Nutrition logging supports barcode scan as the fastest input.",
  },
  {
    id: "segment-leaderboard",
    source: "Strava",
    rule: "Activity segments show personal bests first, global bests second.",
  },
] as const;

/* ── Three-ring goal ring completion ─────────────────────────────────── */

export type RingGoal = {
  id: "move" | "exercise" | "stand" | "mind";
  target: number;
  progress: number;
};

export function ringCompletion(goal: RingGoal): number {
  if (goal.target <= 0) return 0;
  return Math.max(0, Math.min(1.5, goal.progress / goal.target));
}

export function ringsClosed(goals: readonly RingGoal[]): number {
  return goals.filter((g) => ringCompletion(g) >= 1).length;
}

/* ── Recovery score ──────────────────────────────────────────────────── */

export type RecoveryInputs = {
  /** Heart rate variability (ms), higher is better. */
  hrvMs: number;
  /** Resting heart rate (bpm), lower is better. */
  restingHr: number;
  /** Sleep duration (hours). */
  sleepHours: number;
  /** Stress 0..1. */
  stress: number;
};

/**
 * Whoop-style 0..100 score. Weights:
 *   HRV 40%, sleep 30%, RHR 20%, stress 10%.
 */
export function recoveryScore(input: RecoveryInputs): number {
  const hrvPart = Math.min(1, Math.max(0, (input.hrvMs - 30) / 70)); // 30-100ms range
  const sleepPart = Math.min(1, Math.max(0, input.sleepHours / 8));
  const rhrPart = Math.min(1, Math.max(0, (80 - input.restingHr) / 30));
  const stressPart = 1 - Math.min(1, Math.max(0, input.stress));
  const score = hrvPart * 0.4 + sleepPart * 0.3 + rhrPart * 0.2 + stressPart * 0.1;
  return Math.round(score * 100);
}

export function recoveryBand(score: number): "red" | "yellow" | "green" {
  if (score < 34) return "red";
  if (score < 67) return "yellow";
  return "green";
}

/* ── Breath guide cadence ────────────────────────────────────────────── */

export type BreathMode = "calm" | "focus" | "sleep" | "energize";

export const BREATH_CADENCES: Record<BreathMode, { inhaleMs: number; holdMs: number; exhaleMs: number }> = {
  calm: { inhaleMs: 4000, holdMs: 0, exhaleMs: 6000 },
  focus: { inhaleMs: 4000, holdMs: 4000, exhaleMs: 4000 },
  sleep: { inhaleMs: 4000, holdMs: 7000, exhaleMs: 8000 },
  energize: { inhaleMs: 2000, holdMs: 0, exhaleMs: 2000 },
};

export function breathCycleMs(mode: BreathMode): number {
  const c = BREATH_CADENCES[mode];
  return c.inhaleMs + c.holdMs + c.exhaleMs;
}

/* ── Gentle streak (doesn't punish one miss) ─────────────────────────── */

export function updateGentleStreak(
  current: number,
  daysSinceLast: number,
  graceDays = 1,
): number {
  if (daysSinceLast === 0) return current;
  if (daysSinceLast === 1) return current + 1;
  if (daysSinceLast <= 1 + graceDays) return current;
  return 1; // reset to 1 for today's activity
}
