/**
 * Creature DNA Compatibility — computes similarity between two DNA vectors.
 *
 * Uses cosine similarity on 16-axis DNA vectors to calculate a compatibility score.
 * Higher scores suggest more harmonious creature pairs (for breeding, social features).
 */

import { DNA_AXES, type CreatureDNA } from "./dna";

export interface CompatibilityResult {
  /** Overall compatibility score 0-100 */
  score: number;
  /** Top matching traits sorted by closeness */
  topTraits: { axis: string; closeness: number }[];
  /** Complementary traits (most different) */
  complementary: { axis: string; difference: number }[];
  /** Predicted offspring trait ranges */
  offspringPrediction: Partial<Record<string, { min: number; max: number }>>;
}

/** Compute cosine similarity between two DNA vectors */
function cosineSimilarity(a: CreatureDNA, b: CreatureDNA): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const axis of DNA_AXES) {
    const va = a[axis];
    const vb = b[axis];
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/** Per-axis closeness (1 - |diff|) */
function axisCloseness(a: CreatureDNA, b: CreatureDNA): { axis: string; closeness: number }[] {
  return DNA_AXES.map((axis) => ({
    axis,
    closeness: 1 - Math.abs(a[axis] - b[axis]),
  })).sort((x, y) => y.closeness - x.closeness);
}

/** Predict offspring trait ranges based on parent DNA */
function predictOffspring(a: CreatureDNA, b: CreatureDNA): Partial<Record<string, { min: number; max: number }>> {
  const result: Partial<Record<string, { min: number; max: number }>> = {};

  for (const axis of DNA_AXES) {
    const va = a[axis];
    const vb = b[axis];
    const avg = (va + vb) / 2;
    const spread = Math.abs(va - vb) * 0.3; // mutation range
    result[axis] = {
      min: Math.max(0, avg - spread),
      max: Math.min(1, avg + spread),
    };
  }

  return result;
}

/**
 * Compute full compatibility analysis between two creatures.
 *
 * @param dnaA  First creature's DNA
 * @param dnaB  Second creature's DNA
 * @returns     Compatibility result with score, top traits, and offspring prediction
 */
export function computeCompatibility(dnaA: CreatureDNA, dnaB: CreatureDNA): CompatibilityResult {
  const similarity = cosineSimilarity(dnaA, dnaB);
  const score = Math.round(similarity * 100);

  const traitCloseness = axisCloseness(dnaA, dnaB);
  const topTraits = traitCloseness.slice(0, 5);
  const complementary = traitCloseness
    .slice(-5)
    .reverse()
    .map((t) => ({ axis: t.axis, difference: 1 - t.closeness }));

  const offspringPrediction = predictOffspring(dnaA, dnaB);

  return { score, topTraits, complementary, offspringPrediction };
}

/**
 * Quick compatibility score only (cheaper computation).
 */
export function quickCompatibilityScore(dnaA: CreatureDNA, dnaB: CreatureDNA): number {
  return Math.round(cosineSimilarity(dnaA, dnaB) * 100);
}
