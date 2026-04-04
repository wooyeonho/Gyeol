/**
 * Growth Path Analyzer
 *
 * Recognizes growth patterns from conversation sequences.
 * Classifies growth into: emotional, intellectual, social, creative.
 * Used by heartbeat to choose autonomous activity types.
 */

import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";

export type GrowthType = "emotional" | "intellectual" | "social" | "creative" | "physical" | "balanced";

export type GrowthAnalysis = {
  /** Primary growth direction */
  primaryGrowth: GrowthType;
  /** Growth scores per category (0..1) */
  scores: Record<GrowthType, number>;
  /** Which DNA axes are growing fastest */
  fastestAxes: DNAAxis[];
  /** Which DNA axes are stagnant */
  stagnantAxes: DNAAxis[];
  /** Suggested autonomous activity to balance growth */
  suggestedActivity: string;
};

const GROWTH_AXIS_MAP: Record<GrowthType, DNAAxis[]> = {
  emotional: ["warmth", "empathy", "openness"],
  intellectual: ["analytical", "curiosity", "verbal"],
  social: ["assertiveness", "adaptability", "playfulness"],
  creative: ["creativity", "intuitive", "openness"],
  physical: ["spatial", "persistence", "stability"],
  balanced: [],
};

/**
 * Analyze growth pattern from DNA snapshots.
 */
export function analyzeGrowthPath(
  snapshots: Array<{ dna: CreatureDNA; messageCount: number }>,
): GrowthAnalysis {
  const axes: DNAAxis[] = [
    "warmth", "curiosity", "playfulness", "empathy", "intensity",
    "stability", "independence", "openness", "verbal", "analytical",
    "creativity", "persistence", "adaptability", "assertiveness",
    "intuitive", "spatial",
  ];

  // Compute per-axis total change (direction-aware)
  const axisChanges: Record<string, number> = {};
  for (const a of axes) axisChanges[a] = 0;

  if (snapshots.length >= 2) {
    const first = snapshots[0].dna;
    const last = snapshots[snapshots.length - 1].dna;
    for (const axis of axes) {
      axisChanges[axis] = (last[axis] ?? 0.5) - (first[axis] ?? 0.5);
    }
  }

  // Score each growth type
  const scores: Record<GrowthType, number> = {
    emotional: 0,
    intellectual: 0,
    social: 0,
    creative: 0,
    physical: 0,
    balanced: 0,
  };

  for (const [growthType, relevantAxes] of Object.entries(GROWTH_AXIS_MAP)) {
    if (growthType === "balanced") continue;
    let total = 0;
    for (const axis of relevantAxes) {
      total += Math.max(0, axisChanges[axis] ?? 0); // Only count positive growth
    }
    scores[growthType as GrowthType] = total / relevantAxes.length;
  }

  // Balance score = inverse of variance
  const scoreValues = Object.values(scores).filter((_, i) => i < 5);
  const mean = scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length;
  const variance = scoreValues.reduce((s, v) => s + (v - mean) ** 2, 0) / scoreValues.length;
  scores.balanced = Math.max(0, 1 - variance * 50);

  // Primary growth
  const primaryGrowth = (Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0][0]) as GrowthType;

  // Fastest axes (top 3 positive change)
  const fastestAxes = Object.entries(axisChanges)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .filter(([, v]) => v > 0.01)
    .map(([k]) => k as DNAAxis);

  // Stagnant axes (near-zero change)
  const stagnantAxes = Object.entries(axisChanges)
    .filter(([, v]) => Math.abs(v) < 0.005)
    .map(([k]) => k as DNAAxis);

  // Suggest activity to balance growth
  const weakestType = (Object.entries(scores)
    .filter(([k]) => k !== "balanced")
    .sort(([, a], [, b]) => a - b)[0][0]) as GrowthType;

  const activitySuggestions: Record<GrowthType, string> = {
    emotional: "bonding",
    intellectual: "school",
    social: "wandering",
    creative: "creation",
    physical: "training",
    balanced: "learner",
  };

  return {
    primaryGrowth,
    scores,
    fastestAxes,
    stagnantAxes,
    suggestedActivity: activitySuggestions[weakestType] ?? "learner",
  };
}
