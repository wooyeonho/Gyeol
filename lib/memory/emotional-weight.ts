/**
 * Emotional Weight
 *
 * Not all memories are equal. A memory that changed who I am should outlast
 * one that didn't. A memory that keeps resurfacing is haunting me for a reason.
 *
 * The memory physics system decays weight by: λ = BASE / (1 + ref_count × 0.3)
 * Higher initial ref_count → slower decay → longer survival.
 *
 * This module computes an initial ref_count boost based on emotional significance,
 * so the decay formula naturally preserves what mattered.
 *
 * Scale:
 *   0   → normal (λ = 0.05/day, archived ~day 46)
 *   5   → significant (λ = 0.02/day, archived ~day 115)
 *   15  → deeply significant (λ = 0.009/day, archived ~day 255)
 *   30  → identity-altering (λ = 0.005/day, archived ~day 460)
 */

import type { DNAAxis } from "@/lib/genome/dna";

const HIGH_INTENSITY_PATTERNS = [
  /죽고\s*싶|죽\s*겠|포기|끝내|그만두/,
  /사랑|미워|싫어|그리워|보고\s*싶|울었|울고/,
  /무서워|두려워|겁나|공황|불안|떨려/,
  /처음으로|처음이야|태어나서|평생|영원/,
  /미쳤|이상해|모르겠|혼란|뭔지\s*모르겠/,
  /want to die|give up|quit|end it|can't anymore/i,
  /love you|hate you|miss you|scared|terrified/i,
  /for the first time|never felt|always|forever/i,
  /don't understand|confused|lost|broken/i,
];

const MILD_INTENSITY_PATTERNS = [
  /기억나|생각났|문득|갑자기|오늘따라/,
  /힘들|지쳤|피곤|버거|벅차|무거워/,
  /기뻐|행복|설레|신나|좋아/,
  /remember|suddenly|out of nowhere|today especially/i,
  /tired|exhausted|heavy|overwhelming/i,
  /happy|excited|thrilled|glad/i,
];

export type EmotionalWeightInput = {
  message: string;
  /** Axes that shifted in DNA after this conversation */
  changedAxes: DNAAxis[];
  /** Whether this triggered a memory moment (a past memory resurfacing) */
  isMemoryMoment: boolean;
  /** How many turns the user has had (depth of relationship) */
  intimacyScore?: number;
};

/**
 * Returns an initial reference_count boost (0–30) representing emotional significance.
 * Plugs directly into the memory physics decay formula.
 */
export function computeEmotionalWeight(input: EmotionalWeightInput): number {
  let score = 0;

  // DNA shift: more axes changed = more identity impact
  const axisCount = input.changedAxes.length;
  if (axisCount >= 4) score += 15;
  else if (axisCount >= 2) score += 8;
  else if (axisCount >= 1) score += 3;

  // High-intensity emotional language
  const highMatch = HIGH_INTENSITY_PATTERNS.some((p) => p.test(input.message));
  if (highMatch) score += 12;
  else {
    const mildMatch = MILD_INTENSITY_PATTERNS.some((p) => p.test(input.message));
    if (mildMatch) score += 4;
  }

  // Memory moment: if this message resurfaces a past memory,
  // it's haunting — the creature keeps returning to it.
  if (input.isMemoryMoment) score += 8;

  // Long messages carry more weight — more was said, more was real
  if (input.message.length > 400) score += 3;
  else if (input.message.length > 150) score += 1;

  // Deep intimacy amplifies everything slightly
  const intimacy = input.intimacyScore ?? 0;
  if (intimacy > 50) score = Math.round(score * 1.2);

  return Math.min(30, score);
}

/**
 * Whether a memory should be considered "haunting" based on its physics state.
 * A haunting memory keeps resurfacing and refuses to decay.
 */
export function isHauntingMemory(memory: {
  reference_count: number | null;
  weight: number | null;
  created_at: string;
}): boolean {
  const refCount = memory.reference_count ?? 0;
  const weight = memory.weight ?? 0;
  const ageDays = (Date.now() - new Date(memory.created_at).getTime()) / 86_400_000;

  // Haunting: old memory that still has high weight (resisted decay)
  // and has been referenced many times (keeps coming back)
  return ageDays > 14 && weight > 0.6 && refCount >= 5;
}
