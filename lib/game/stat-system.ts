/**
 * Creature Stat System — derives visible combat/interaction stats from DNA.
 * Stats are NOT stored; they are always computed from the current DNA vector.
 * This keeps DNA as the single source of truth while giving players
 * familiar RPG numbers to compare and optimize.
 *
 * Base stat range: 10–100 (derived from DNA axes 0–1)
 * Level scaling: +2% per gen_level
 * Vitality modifier: low vitality reduces effective stats
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export interface CreatureStats {
  hp: number;       // Health/durability — warmth + stability + persistence
  atk: number;      // Offense — intensity + assertiveness + analytical
  def: number;      // Defense — stability + independence + adaptability
  spd: number;      // Speed — intuitive + playfulness + creativity
  wis: number;      // Wisdom — empathy + openness + curiosity
  cha: number;      // Charisma — warmth + verbal + playfulness
}

export type StatKey = keyof CreatureStats;

export const STAT_CONFIG: Record<StatKey, {
  label: { ko: string; en: string };
  color: string;
  icon: string;
  axes: (keyof CreatureDNA)[];
  weights: number[];
}> = {
  hp: {
    label: { ko: "체력", en: "HP" },
    color: "#ef4444",
    icon: "❤️",
    axes: ["warmth", "stability", "persistence"],
    weights: [0.35, 0.35, 0.30],
  },
  atk: {
    label: { ko: "공격", en: "ATK" },
    color: "#f97316",
    icon: "⚔️",
    axes: ["intensity", "assertiveness", "analytical"],
    weights: [0.40, 0.35, 0.25],
  },
  def: {
    label: { ko: "방어", en: "DEF" },
    color: "#3b82f6",
    icon: "🛡️",
    axes: ["stability", "independence", "adaptability"],
    weights: [0.35, 0.35, 0.30],
  },
  spd: {
    label: { ko: "속도", en: "SPD" },
    color: "#22c55e",
    icon: "💨",
    axes: ["intuitive", "playfulness", "creativity"],
    weights: [0.35, 0.35, 0.30],
  },
  wis: {
    label: { ko: "지혜", en: "WIS" },
    color: "#a855f7",
    icon: "📖",
    axes: ["empathy", "openness", "curiosity"],
    weights: [0.35, 0.30, 0.35],
  },
  cha: {
    label: { ko: "매력", en: "CHA" },
    color: "#ec4899",
    icon: "✨",
    axes: ["warmth", "verbal", "playfulness"],
    weights: [0.35, 0.35, 0.30],
  },
};

const BASE_MIN = 10;
const BASE_MAX = 100;
const LEVEL_SCALE = 0.02; // +2% per level
const VITALITY_FLOOR = 0.6; // At 0 vitality, stats drop to 60% of base

/** Compute a single stat from DNA axes and weights */
function computeStat(dna: CreatureDNA, axes: (keyof CreatureDNA)[], weights: number[]): number {
  let weighted = 0;
  for (let i = 0; i < axes.length; i++) {
    weighted += dna[axes[i]] * weights[i];
  }
  return BASE_MIN + weighted * (BASE_MAX - BASE_MIN);
}

/** Calculate all stats for a creature */
export function calculateStats(
  dna: CreatureDNA,
  genLevel: number = 1,
  vitality: number = 1.0,
): CreatureStats {
  const levelMultiplier = 1 + (genLevel - 1) * LEVEL_SCALE;
  const vitalityMultiplier = VITALITY_FLOOR + vitality * (1 - VITALITY_FLOOR);

  const stats = {} as CreatureStats;
  for (const [key, config] of Object.entries(STAT_CONFIG)) {
    const base = computeStat(dna, config.axes, config.weights);
    stats[key as StatKey] = Math.round(base * levelMultiplier * vitalityMultiplier);
  }
  return stats;
}

/** Get total power (sum of all stats) */
export function getTotalPower(stats: CreatureStats): number {
  return stats.hp + stats.atk + stats.def + stats.spd + stats.wis + stats.cha;
}

/** Get stat grade based on value */
export function getStatGrade(value: number): { grade: string; color: string } {
  if (value >= 90) return { grade: "S", color: "#fbbf24" };
  if (value >= 75) return { grade: "A", color: "#a78bfa" };
  if (value >= 60) return { grade: "B", color: "#60a5fa" };
  if (value >= 45) return { grade: "C", color: "#34d399" };
  if (value >= 30) return { grade: "D", color: "#fb923c" };
  return { grade: "F", color: "#94a3b8" };
}

/** Compare two creatures' stats */
export function compareStats(a: CreatureStats, b: CreatureStats): Record<StatKey, number> {
  return {
    hp: a.hp - b.hp,
    atk: a.atk - b.atk,
    def: a.def - b.def,
    spd: a.spd - b.spd,
    wis: a.wis - b.wis,
    cha: a.cha - b.cha,
  };
}

/** Get the strongest and weakest stat */
export function getStatExtremes(stats: CreatureStats): { strongest: StatKey; weakest: StatKey } {
  let strongest: StatKey = "hp";
  let weakest: StatKey = "hp";

  for (const key of Object.keys(stats) as StatKey[]) {
    if (stats[key] > stats[strongest]) strongest = key;
    if (stats[key] < stats[weakest]) weakest = key;
  }

  return { strongest, weakest };
}
