/**
 * Personality Quiz — MBTI-style 5-question onboarding that seeds initial DNA.
 *
 * Each question maps to 2-3 DNA axes. The user's answers create a weighted
 * seed that replaces the random initial DNA, making the creature feel "chosen."
 */

import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";

export interface QuizQuestion {
  id: string;
  options: { id: string; nudges: Partial<Record<DNAAxis, number>> }[];
}

/**
 * 5 personality quiz questions.
 * Each option nudges specific DNA axes toward 0.3 (low) or 0.7 (high).
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    // Q1: Social orientation
    id: "q1_social",
    options: [
      { id: "alone", nudges: { independence: 0.72, warmth: 0.35, assertiveness: 0.3 } },
      { id: "small_group", nudges: { empathy: 0.65, warmth: 0.6, independence: 0.45 } },
      { id: "big_crowd", nudges: { warmth: 0.75, playfulness: 0.7, assertiveness: 0.65 } },
    ],
  },
  {
    // Q2: Problem-solving style
    id: "q2_thinking",
    options: [
      { id: "logic", nudges: { analytical: 0.75, stability: 0.65, intuitive: 0.3 } },
      { id: "feeling", nudges: { intuitive: 0.7, empathy: 0.7, openness: 0.65 } },
      { id: "creative", nudges: { creativity: 0.75, openness: 0.7, adaptability: 0.65 } },
    ],
  },
  {
    // Q3: Energy source
    id: "q3_energy",
    options: [
      { id: "challenge", nudges: { intensity: 0.7, persistence: 0.7, assertiveness: 0.6 } },
      { id: "peace", nudges: { stability: 0.75, empathy: 0.55, openness: 0.5 } },
      { id: "novelty", nudges: { curiosity: 0.75, adaptability: 0.7, playfulness: 0.6 } },
    ],
  },
  {
    // Q4: Expression style
    id: "q4_expression",
    options: [
      { id: "words", nudges: { verbal: 0.75, openness: 0.6, assertiveness: 0.55 } },
      { id: "actions", nudges: { spatial: 0.7, persistence: 0.65, verbal: 0.3 } },
      { id: "art", nudges: { creativity: 0.7, intuitive: 0.65, spatial: 0.6 } },
    ],
  },
  {
    // Q5: Life philosophy
    id: "q5_philosophy",
    options: [
      { id: "explore", nudges: { curiosity: 0.7, openness: 0.7, adaptability: 0.65 } },
      { id: "connect", nudges: { warmth: 0.7, empathy: 0.75, playfulness: 0.55 } },
      { id: "master", nudges: { persistence: 0.75, analytical: 0.65, intensity: 0.6 } },
    ],
  },
];

/**
 * Convert quiz answers into a seeded DNA profile.
 * Answers is a map of questionId -> optionId.
 */
export function quizAnswersToDNA(
  answers: Record<string, string>,
  agentId: string,
): CreatureDNA {
  // Start with neutral base (0.5 for all axes)
  const dna: Record<string, number> = {};
  for (const axis of DNA_AXES) {
    dna[axis] = 0.5;
  }

  // Count how many times each axis is nudged
  const nudgeCounts: Record<string, number> = {};
  for (const axis of DNA_AXES) nudgeCounts[axis] = 0;

  // Apply quiz nudges
  for (const q of QUIZ_QUESTIONS) {
    const selectedOptionId = answers[q.id];
    if (!selectedOptionId) continue;

    const option = q.options.find((o) => o.id === selectedOptionId);
    if (!option) continue;

    for (const [axis, target] of Object.entries(option.nudges) as [DNAAxis, number][]) {
      // Weighted average: move toward the target value
      const currentCount = nudgeCounts[axis] || 0;
      const currentAvg = dna[axis];
      dna[axis] = (currentAvg * currentCount + target) / (currentCount + 1);
      nudgeCounts[axis] = currentCount + 1;
    }
  }

  // Add small deterministic noise from agentId to ensure uniqueness
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < DNA_AXES.length; i++) {
    const axis = DNA_AXES[i];
    const noise = ((Math.abs(hash + i * 7919) % 1000) / 10000) - 0.05; // ±0.05
    dna[axis] = Math.max(0.05, Math.min(0.95, dna[axis] + noise));
  }

  return dna as unknown as CreatureDNA;
}

/**
 * Creature type result from quiz — a human-readable archetype description.
 */
export interface QuizResult {
  typeKey: string; // i18n key for the type name
  descKey: string; // i18n key for description
  emoji: string;
  dominantAxes: DNAAxis[];
}

/**
 * Derive a quiz result type from the DNA profile.
 */
export function deriveQuizResult(dna: CreatureDNA): QuizResult {
  // Find top 3 axes
  const sorted = [...DNA_AXES].sort((a, b) => dna[b] - dna[a]);
  const top3 = sorted.slice(0, 3);

  // Map dominant trait combinations to types
  if (top3.includes("warmth") && top3.includes("empathy")) {
    return { typeKey: "quiz.typeHealer", descKey: "quiz.descHealer", emoji: "💗", dominantAxes: top3 };
  }
  if (top3.includes("analytical") && top3.includes("persistence")) {
    return { typeKey: "quiz.typeScholar", descKey: "quiz.descScholar", emoji: "📚", dominantAxes: top3 };
  }
  if (top3.includes("creativity") && top3.includes("intuitive")) {
    return { typeKey: "quiz.typeDreamer", descKey: "quiz.descDreamer", emoji: "🌙", dominantAxes: top3 };
  }
  if (top3.includes("curiosity") && top3.includes("openness")) {
    return { typeKey: "quiz.typeExplorer", descKey: "quiz.descExplorer", emoji: "🧭", dominantAxes: top3 };
  }
  if (top3.includes("intensity") && top3.includes("assertiveness")) {
    return { typeKey: "quiz.typeWarrior", descKey: "quiz.descWarrior", emoji: "⚔️", dominantAxes: top3 };
  }
  if (top3.includes("playfulness") && top3.includes("adaptability")) {
    return { typeKey: "quiz.typeTrickster", descKey: "quiz.descTrickster", emoji: "🎭", dominantAxes: top3 };
  }
  if (top3.includes("stability") && top3.includes("independence")) {
    return { typeKey: "quiz.typeGuardian", descKey: "quiz.descGuardian", emoji: "🛡️", dominantAxes: top3 };
  }

  // Default
  return { typeKey: "quiz.typeWanderer", descKey: "quiz.descWanderer", emoji: "✨", dominantAxes: top3 };
}
