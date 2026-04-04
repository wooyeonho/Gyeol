/**
 * Learning Theory Module — PAC/VC Bounds for DNA Evolution
 *
 * Applies computational learning theory to Gyeol's DNA evolution system:
 * - PAC bounds: guarantee DNA converges to "true" personality with enough conversations
 * - VC dimension: estimate complexity of the soft mutation function
 * - Convergence monitoring: track whether DNA is stabilizing over time
 */

import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";

// ─── PAC Learning Bounds ───

/**
 * Compute PAC (Probably Approximately Correct) bound.
 * Given m conversation samples, can we guarantee the DNA is within
 * epsilon of the "true" personality with probability >= 1 - delta?
 *
 * Uses Hoeffding-style bound adapted for bounded [0,1] DNA axes.
 */
export function computePACBound(
  sampleCount: number,
  epsilon: number,
  delta: number,
): { sufficient: boolean; requiredSamples: number; confidence: number } {
  // For bounded [0,1] random variables with 16 axes:
  // Required samples m >= (1 / (2 * epsilon^2)) * ln(2 * d / delta)
  const d = 16; // DNA dimensionality
  const requiredSamples = Math.ceil(
    (1 / (2 * epsilon * epsilon)) * Math.log((2 * d) / delta),
  );

  const sufficient = sampleCount >= requiredSamples;

  // Actual confidence at current sample count:
  // delta_actual = 2d * exp(-2 * m * epsilon^2)
  const confidence = Math.max(
    0,
    Math.min(1, 1 - 2 * d * Math.exp(-2 * sampleCount * epsilon * epsilon)),
  );

  return { sufficient, requiredSamples, confidence };
}

/**
 * Check if an agent has enough conversations to evolve reliably.
 * Uses PAC bound with epsilon=0.1, delta=0.05 (95% confidence, within 10%).
 */
export function isEvolutionReliable(
  totalMessages: number,
  epsilon = 0.1,
  delta = 0.05,
): boolean {
  return computePACBound(totalMessages, epsilon, delta).sufficient;
}

// ─── VC Dimension Estimation ───

/**
 * Estimate the VC dimension of the soft mutation function.
 *
 * The soft mutation maps (message_features) -> (dna_delta).
 * With 16 output axes and keyword-based feature extraction,
 * the effective VC dimension is bounded by the number of
 * independent feature-axis pairs.
 *
 * Returns an estimate useful for sample complexity calculations.
 */
export function estimateVCDimension(
  dnaAxes: number = 16,
  featureCategories: number = 8,
): { vcDim: number; sampleComplexity: number } {
  // Each axis can be influenced by multiple feature categories
  // VC dim ~ O(d * k) where d = axes, k = feature categories
  // But with shared features, effective dim is lower
  const vcDim = Math.ceil(dnaAxes * Math.log2(featureCategories + 1));

  // Sample complexity for PAC learning: m >= (4/epsilon^2) * (vc * ln(12/epsilon) + ln(2/delta))
  const epsilon = 0.1;
  const delta = 0.05;
  const sampleComplexity = Math.ceil(
    (4 / (epsilon * epsilon)) * (vcDim * Math.log(12 / epsilon) + Math.log(2 / delta)),
  );

  return { vcDim, sampleComplexity };
}

// ─── Convergence Monitoring ───

export type ConvergenceReport = {
  /** Whether DNA changes are decreasing over time */
  isConverging: boolean;
  /** Average DNA change magnitude in recent window */
  recentChangeMagnitude: number;
  /** Rate of change decrease (negative = converging) */
  changeRate: number;
  /** Estimated conversations until convergence (Infinity if diverging) */
  estimatedConversationsToConverge: number;
  /** Per-axis stability (0 = volatile, 1 = stable) */
  axisStability: Partial<Record<DNAAxis, number>>;
};

/**
 * Analyze DNA convergence from a history of snapshots.
 * Each snapshot is { dna, timestamp, messageCount }.
 */
export function analyzeConvergence(
  snapshots: Array<{ dna: CreatureDNA; messageCount: number }>,
): ConvergenceReport {
  if (snapshots.length < 3) {
    return {
      isConverging: false,
      recentChangeMagnitude: 1,
      changeRate: 0,
      estimatedConversationsToConverge: Infinity,
      axisStability: {},
    };
  }

  const axes: DNAAxis[] = [
    "warmth", "curiosity", "playfulness", "empathy", "intensity",
    "stability", "independence", "openness", "verbal", "analytical",
    "creativity", "persistence", "adaptability", "assertiveness",
    "intuitive", "spatial",
  ];

  // Compute per-step change magnitudes
  const changes: number[] = [];
  const axisChanges: Record<string, number[]> = {};
  for (const a of axes) axisChanges[a] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].dna;
    const curr = snapshots[i].dna;
    let magnitude = 0;

    for (const axis of axes) {
      const delta = Math.abs((curr[axis] ?? 0.5) - (prev[axis] ?? 0.5));
      magnitude += delta * delta;
      axisChanges[axis].push(delta);
    }

    changes.push(Math.sqrt(magnitude));
  }

  // Recent window (last 5 changes or all if fewer)
  const windowSize = Math.min(5, changes.length);
  const recentChanges = changes.slice(-windowSize);
  const recentChangeMagnitude =
    recentChanges.reduce((s, c) => s + c, 0) / recentChanges.length;

  // Compute change rate (slope of change magnitudes)
  // Negative slope = converging
  let changeRate = 0;
  if (changes.length >= 3) {
    const firstHalf = changes.slice(0, Math.floor(changes.length / 2));
    const secondHalf = changes.slice(Math.floor(changes.length / 2));
    const avgFirst = firstHalf.reduce((s, c) => s + c, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, c) => s + c, 0) / secondHalf.length;
    changeRate = avgSecond - avgFirst;
  }

  const isConverging = changeRate < -0.001 || recentChangeMagnitude < 0.02;

  // Estimate conversations to converge
  let estimatedConversationsToConverge = Infinity;
  if (changeRate < -0.001 && recentChangeMagnitude > 0.01) {
    // Linear extrapolation: how many more steps until magnitude reaches 0.01
    estimatedConversationsToConverge = Math.ceil(
      (recentChangeMagnitude - 0.01) / Math.abs(changeRate),
    );
  } else if (recentChangeMagnitude < 0.02) {
    estimatedConversationsToConverge = 0;
  }

  // Per-axis stability
  const axisStability: Partial<Record<DNAAxis, number>> = {};
  for (const axis of axes) {
    const ac = axisChanges[axis];
    if (ac.length === 0) continue;
    const recentAc = ac.slice(-windowSize);
    const avgChange = recentAc.reduce((s, c) => s + c, 0) / recentAc.length;
    // Stability: 1 when change is 0, 0 when change is large
    axisStability[axis] = Math.max(0, 1 - avgChange * 20);
  }

  return {
    isConverging,
    recentChangeMagnitude,
    changeRate,
    estimatedConversationsToConverge,
    axisStability,
  };
}
