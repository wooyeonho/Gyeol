/**
 * Evolution Predictor
 *
 * Predicts future DNA state based on current DNA + conversation patterns.
 * Uses statistical extrapolation from historical mutation data.
 * Can be enhanced with ML models when training data accumulates.
 */

import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";

export type PredictionResult = {
  /** Predicted DNA state at horizon */
  predictedDna: Partial<Record<DNAAxis, number>>;
  /** Per-axis confidence (0..1) */
  confidence: Partial<Record<DNAAxis, number>>;
  /** Overall prediction confidence */
  overallConfidence: number;
  /** Predicted dominant traits at horizon */
  dominantAxes: DNAAxis[];
  /** Predicted species archetype tendency */
  archetypeTendency: string;
};

const DNA_AXES: DNAAxis[] = [
  "warmth", "curiosity", "playfulness", "empathy", "intensity",
  "stability", "independence", "openness", "verbal", "analytical",
  "creativity", "persistence", "adaptability", "assertiveness",
  "intuitive", "spatial",
];

/**
 * Predict future DNA evolution based on current trajectory.
 *
 * @param currentDna Current DNA state
 * @param recentDeltas Array of recent DNA changes (newest first)
 * @param horizon Number of conversations ahead to predict
 */
export function predictEvolution(
  currentDna: CreatureDNA,
  recentDeltas: Array<Partial<Record<DNAAxis, number>>>,
  horizon: number = 50,
): PredictionResult {
  const predictedDna: Partial<Record<DNAAxis, number>> = {};
  const confidence: Partial<Record<DNAAxis, number>> = {};

  for (const axis of DNA_AXES) {
    const current = currentDna[axis] ?? 0.5;

    // Compute weighted average of recent deltas (exponential decay)
    let weightedDelta = 0;
    let totalWeight = 0;

    for (let i = 0; i < recentDeltas.length; i++) {
      const delta = recentDeltas[i][axis] ?? 0;
      const weight = Math.exp(-i * 0.3); // Recent deltas weighted more
      weightedDelta += delta * weight;
      totalWeight += weight;
    }

    const avgDelta = totalWeight > 0 ? weightedDelta / totalWeight : 0;

    // Extrapolate with diminishing returns (DNA converges)
    // Use logarithmic scaling: change decreases as we approach bounds
    const rawPrediction = current + avgDelta * horizon * 0.7;
    // Clamp to [0, 1] with soft boundary
    const predicted = 1 / (1 + Math.exp(-6 * (rawPrediction - 0.5)));

    predictedDna[axis] = predicted;

    // Confidence based on consistency of deltas
    if (recentDeltas.length < 3) {
      confidence[axis] = 0.2;
    } else {
      const signs = recentDeltas.slice(0, 5).map((d) => Math.sign(d[axis] ?? 0));
      const consistent = signs.filter((s) => s === signs[0]).length / signs.length;
      confidence[axis] = Math.min(0.9, consistent * 0.5 + (recentDeltas.length / 20) * 0.4);
    }
  }

  // Overall confidence
  const confidenceValues = Object.values(confidence).filter((v): v is number => v !== undefined);
  const overallConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((s, c) => s + c, 0) / confidenceValues.length
    : 0.1;

  // Dominant axes: top 3 predicted values
  const sorted = DNA_AXES
    .map((a) => ({ axis: a, value: predictedDna[a] ?? 0.5 }))
    .sort((a, b) => b.value - a.value);
  const dominantAxes = sorted.slice(0, 3).map((s) => s.axis);

  // Archetype tendency from dominant axes
  const archetypeTendency = inferArchetypeTendency(predictedDna);

  return {
    predictedDna,
    confidence,
    overallConfidence,
    dominantAxes,
    archetypeTendency,
  };
}

function inferArchetypeTendency(
  dna: Partial<Record<DNAAxis, number>>,
): string {
  const scores: Record<string, number> = {
    organic: (dna.warmth ?? 0.5) * 0.4 + (dna.empathy ?? 0.5) * 0.3 + (dna.adaptability ?? 0.5) * 0.3,
    crystalline: (dna.analytical ?? 0.5) * 0.4 + (dna.persistence ?? 0.5) * 0.3 + (dna.stability ?? 0.5) * 0.3,
    ethereal: (dna.intuitive ?? 0.5) * 0.4 + (dna.openness ?? 0.5) * 0.3 + (dna.creativity ?? 0.5) * 0.3,
    volcanic: (dna.intensity ?? 0.5) * 0.4 + (dna.assertiveness ?? 0.5) * 0.3 + (dna.persistence ?? 0.5) * 0.3,
    verdant: (dna.warmth ?? 0.5) * 0.3 + (dna.creativity ?? 0.5) * 0.4 + (dna.openness ?? 0.5) * 0.3,
    fluid: (dna.adaptability ?? 0.5) * 0.4 + (dna.playfulness ?? 0.5) * 0.3 + (dna.curiosity ?? 0.5) * 0.3,
  };

  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
}
