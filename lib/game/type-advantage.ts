/**
 * DNA-based type advantage system — Pokemon-inspired type matchups.
 * Instead of discrete types, advantages are calculated from DNA axis dominance.
 * This creates a continuous, emergent type system unique to Gyeol.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export type DominantType = "analytical" | "emotional" | "social" | "creative" | "balanced";

export interface TypeMatchup {
  attackerType: DominantType;
  defenderType: DominantType;
  multiplier: number; // 0.5 = weak, 1.0 = neutral, 1.5 = strong, 2.0 = super effective
  label: { ko: string; en: string };
}

/** Determine dominant type from DNA */
export function getDominantType(dna: CreatureDNA): DominantType {
  const cognitive = (dna.analytical + dna.intuitive + dna.verbal + dna.spatial) / 4;
  const emotional = (dna.warmth + dna.intensity + dna.stability + dna.openness) / 4;
  const social = (dna.assertiveness + dna.empathy + dna.playfulness + dna.independence) / 4;
  const creative = (dna.curiosity + dna.persistence + dna.adaptability + dna.creativity) / 4;

  const scores = [
    { type: "analytical" as const, score: cognitive },
    { type: "emotional" as const, score: emotional },
    { type: "social" as const, score: social },
    { type: "creative" as const, score: creative },
  ];

  scores.sort((a, b) => b.score - a.score);

  // "Balanced" if top two are within 0.08 of each other
  if (scores[0].score - scores[1].score < 0.08) return "balanced";
  return scores[0].type;
}

/**
 * Type advantage matrix — rock-paper-scissors-lizard-Spock style:
 *
 * Analytical > Creative (logic beats chaos)
 * Creative > Social (imagination disrupts norms)
 * Social > Emotional (composure beats feelings)
 * Emotional > Analytical (passion overrides logic)
 * Balanced = neutral to all
 */
const ADVANTAGE_MAP: Record<DominantType, DominantType[]> = {
  analytical: ["creative"],
  creative: ["social"],
  social: ["emotional"],
  emotional: ["analytical"],
  balanced: [],
};

const WEAKNESS_MAP: Record<DominantType, DominantType[]> = {
  analytical: ["emotional"],
  creative: ["analytical"],
  social: ["creative"],
  emotional: ["social"],
  balanced: [],
};

/** Calculate type advantage multiplier between two creatures */
export function calculateTypeAdvantage(attacker: CreatureDNA, defender: CreatureDNA): TypeMatchup {
  const attackerType = getDominantType(attacker);
  const defenderType = getDominantType(defender);

  let multiplier = 1.0;
  let label: { ko: string; en: string };

  if (ADVANTAGE_MAP[attackerType]?.includes(defenderType)) {
    multiplier = 1.5;
    label = { ko: "효과적!", en: "Super effective!" };
  } else if (WEAKNESS_MAP[attackerType]?.includes(defenderType)) {
    multiplier = 0.67;
    label = { ko: "효과 약함...", en: "Not very effective..." };
  } else if (attackerType === "balanced" || defenderType === "balanced") {
    multiplier = 1.0;
    label = { ko: "보통", en: "Normal" };
  } else {
    multiplier = 1.0;
    label = { ko: "보통", en: "Normal" };
  }

  // Fine-grained adjustment: specific axis advantages give small bonuses
  const axisBonus = calculateAxisBonus(attacker, defender);
  multiplier *= (1 + axisBonus);

  return { attackerType, defenderType, multiplier, label };
}

/** Calculate fine-grained axis-vs-axis bonus (±5%) */
function calculateAxisBonus(attacker: CreatureDNA, defender: CreatureDNA): number {
  let bonus = 0;

  // High analytical vs low stability = +3% (overthinking destabilizes)
  if (attacker.analytical > 0.7 && defender.stability < 0.4) bonus += 0.03;

  // High empathy vs low independence = +3% (emotional leverage)
  if (attacker.empathy > 0.7 && defender.independence < 0.4) bonus += 0.03;

  // High persistence vs low adaptability = +3% (wearing down)
  if (attacker.persistence > 0.7 && defender.adaptability < 0.4) bonus += 0.03;

  // High creativity vs low openness = -2% (creativity wasted on closed mind)
  if (attacker.creativity > 0.7 && defender.openness < 0.3) bonus -= 0.02;

  // High assertiveness vs high assertiveness = mutual reduction
  if (attacker.assertiveness > 0.7 && defender.assertiveness > 0.7) bonus -= 0.02;

  return Math.max(-0.1, Math.min(0.1, bonus)); // Cap at ±10%
}

/** Get type advantage description for UI display */
export function getTypeLabel(type: DominantType): { ko: string; en: string; color: string; icon: string } {
  switch (type) {
    case "analytical": return { ko: "분석형", en: "Analytical", color: "#38bdf8", icon: "🧠" };
    case "emotional": return { ko: "감정형", en: "Emotional", color: "#f472b6", icon: "💗" };
    case "social": return { ko: "사교형", en: "Social", color: "#34d399", icon: "🤝" };
    case "creative": return { ko: "창조형", en: "Creative", color: "#a78bfa", icon: "🎨" };
    case "balanced": return { ko: "균형형", en: "Balanced", color: "#fbbf24", icon: "⚖️" };
  }
}

/** Get type advantage chart data for UI */
export function getTypeChart(): Array<{ attacker: DominantType; defender: DominantType; result: "strong" | "weak" | "neutral" }> {
  const types: DominantType[] = ["analytical", "emotional", "social", "creative"];
  const chart: Array<{ attacker: DominantType; defender: DominantType; result: "strong" | "weak" | "neutral" }> = [];

  for (const attacker of types) {
    for (const defender of types) {
      if (attacker === defender) {
        chart.push({ attacker, defender, result: "neutral" });
      } else if (ADVANTAGE_MAP[attacker]?.includes(defender)) {
        chart.push({ attacker, defender, result: "strong" });
      } else if (WEAKNESS_MAP[attacker]?.includes(defender)) {
        chart.push({ attacker, defender, result: "weak" });
      } else {
        chart.push({ attacker, defender, result: "neutral" });
      }
    }
  }

  return chart;
}
