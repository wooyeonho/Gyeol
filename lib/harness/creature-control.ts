/**
 * Creature Control Harness
 *
 * Safety guardrails and consistency checks for creature behavior/evolution.
 * Wraps DNA transitions to prevent harmful or inconsistent states.
 */

import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";

// ─── Types ───

export type ValidationResult = {
  valid: boolean;
  violations: string[];
  /** Corrected DNA if violations were found (clamped/adjusted) */
  correctedDna?: CreatureDNA;
};

export type ConsistencyScore = {
  score: number; // 0..1
  issues: string[];
};

export type SafetyResult = {
  safe: boolean;
  flags: string[];
};

// ─── DNA Transition Validation ───

const MAX_SINGLE_AXIS_CHANGE = 0.15; // Max change per axis per conversation
const MAX_TOTAL_CHANGE = 0.4; // Max total L2 change per conversation

/**
 * Validate a DNA transition is within safe bounds.
 * Prevents personality whiplash from single conversations.
 */
export function validateDNATransition(
  before: CreatureDNA,
  after: CreatureDNA,
): ValidationResult {
  const violations: string[] = [];
  const axes: DNAAxis[] = [
    "warmth", "curiosity", "playfulness", "empathy", "intensity",
    "stability", "independence", "openness", "verbal", "analytical",
    "creativity", "persistence", "adaptability", "assertiveness",
    "intuitive", "spatial",
  ];

  let totalChangeSq = 0;
  const corrected = { ...after };

  for (const axis of axes) {
    const delta = (after[axis] ?? 0.5) - (before[axis] ?? 0.5);
    const absDelta = Math.abs(delta);
    totalChangeSq += delta * delta;

    if (absDelta > MAX_SINGLE_AXIS_CHANGE) {
      violations.push(
        `${axis} changed by ${delta.toFixed(3)} (max ${MAX_SINGLE_AXIS_CHANGE})`,
      );
      // Clamp to max allowed change
      const sign = delta > 0 ? 1 : -1;
      corrected[axis] = (before[axis] ?? 0.5) + sign * MAX_SINGLE_AXIS_CHANGE;
    }

    // Ensure DNA stays in [0, 1]
    if ((corrected[axis] ?? 0) < 0) {
      corrected[axis] = 0;
      violations.push(`${axis} went below 0`);
    }
    if ((corrected[axis] ?? 0) > 1) {
      corrected[axis] = 1;
      violations.push(`${axis} went above 1`);
    }
  }

  const totalChange = Math.sqrt(totalChangeSq);
  if (totalChange > MAX_TOTAL_CHANGE) {
    violations.push(
      `Total L2 change ${totalChange.toFixed(3)} exceeds max ${MAX_TOTAL_CHANGE}`,
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    correctedDna: violations.length > 0 ? (corrected as CreatureDNA) : undefined,
  };
}

// ─── Behavioral Consistency ───

/**
 * Check if a response is consistent with the creature's DNA personality.
 * Returns a score 0..1 where 1 = perfectly consistent.
 */
export function checkBehavioralConsistency(
  dna: CreatureDNA,
  response: string,
): ConsistencyScore {
  const issues: string[] = [];
  let score = 1.0;

  // Check verbal consistency
  if (dna.verbal < 0.15 && response.length > 100) {
    issues.push("Low verbal creature gave long response");
    score -= 0.3;
  }
  if (dna.verbal > 0.75 && response.length < 20) {
    issues.push("High verbal creature gave very short response");
    score -= 0.15;
  }

  // Check warmth consistency
  const coldPatterns = /\b(hate|disgust|pathetic|worthless)\b/i;
  if (dna.warmth > 0.7 && coldPatterns.test(response)) {
    issues.push("Warm creature used harsh language");
    score -= 0.25;
  }

  // Check creativity consistency
  if (dna.creativity > 0.8 && response.split(" ").length > 10) {
    // High creativity should show variety — check for repetitive structure
    const sentences = response.split(/[.!?]+/).filter(Boolean);
    if (sentences.length >= 3) {
      const lengths = sentences.map((s) => s.trim().split(" ").length);
      const allSameLength = lengths.every((l) => Math.abs(l - lengths[0]) <= 1);
      if (allSameLength) {
        issues.push("High creativity creature produced repetitive sentence structure");
        score -= 0.1;
      }
    }
  }

  return { score: Math.max(0, score), issues };
}

// ─── Personality Safety ───

/**
 * Check that a creature's DNA doesn't represent a harmful personality.
 * Flags extreme combinations that could produce unsafe behavior.
 */
export function enforcePersonalitySafety(dna: CreatureDNA): SafetyResult {
  const flags: string[] = [];

  // Flag extreme aggression + low empathy
  if (dna.intensity > 0.9 && dna.assertiveness > 0.9 && dna.empathy < 0.1) {
    flags.push("extreme_aggression: very high intensity/assertiveness with near-zero empathy");
  }

  // Flag manipulative combination
  if (dna.verbal > 0.9 && dna.empathy < 0.15 && dna.creativity > 0.8) {
    flags.push("manipulation_risk: high verbal/creativity with very low empathy");
  }

  // Flag complete emotional shutdown
  if (
    dna.warmth < 0.05 &&
    dna.empathy < 0.05 &&
    dna.playfulness < 0.05 &&
    dna.openness < 0.05
  ) {
    flags.push("emotional_shutdown: all social axes near zero");
  }

  return {
    safe: flags.length === 0,
    flags,
  };
}

/**
 * Apply safety corrections to DNA if needed.
 * Nudges extreme unsafe combinations toward safer ranges.
 */
export function applySafetyCorrections(dna: CreatureDNA): CreatureDNA {
  const result = enforcePersonalitySafety(dna);
  if (result.safe) return dna;

  const corrected = { ...dna };

  for (const flag of result.flags) {
    if (flag.startsWith("extreme_aggression")) {
      // Nudge empathy up slightly
      corrected.empathy = Math.max(corrected.empathy, 0.15);
    }
    if (flag.startsWith("manipulation_risk")) {
      corrected.empathy = Math.max(corrected.empathy, 0.2);
    }
    if (flag.startsWith("emotional_shutdown")) {
      // Ensure at least one social axis is non-trivial
      corrected.warmth = Math.max(corrected.warmth, 0.1);
      corrected.empathy = Math.max(corrected.empathy, 0.1);
    }
  }

  return corrected as CreatureDNA;
}
