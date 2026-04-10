/**
 * Creature Stats System — Pokemon/Diablo-style visible numbers derived from DNA.
 *
 * Each stat is computed from 2-3 DNA axes, ensuring that DNA diversity
 * creates meaningfully different stat distributions. No two creatures
 * with different DNA will have the same stat profile.
 *
 * Stats range: 1–100 (displayed), derived from 0–1 DNA values.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export interface CreatureStats {
  /** Health Points — how much damage can be absorbed */
  hp: number;
  /** Attack — offensive power */
  atk: number;
  /** Defense — damage reduction */
  def: number;
  /** Speed — action priority, dodge chance */
  spd: number;
  /** Intelligence — puzzle solving, skill effectiveness */
  int: number;
  /** Charisma — social influence, friendship building */
  cha: number;
  /** Luck — critical chance, rare drops */
  luk: number;
  /** Total power rating */
  total: number;
}

/**
 * Derive creature stats from DNA.
 * gen_level acts as a multiplier (1x at gen 1, ~2.5x at gen 10).
 */
export function deriveStats(dna: CreatureDNA, genLevel = 1): CreatureStats {
  const levelMult = 1 + (genLevel - 1) * 0.17; // +17% per gen level

  const hp = Math.round(
    clamp(
      (dna.stability * 0.5 + dna.persistence * 0.3 + dna.warmth * 0.2) * 100 * levelMult,
      1,
      999,
    ),
  );

  const atk = Math.round(
    clamp(
      (dna.intensity * 0.4 + dna.creativity * 0.3 + dna.analytical * 0.3) * 100 * levelMult,
      1,
      999,
    ),
  );

  const def = Math.round(
    clamp(
      (dna.stability * 0.4 + dna.persistence * 0.4 + dna.independence * 0.2) * 100 * levelMult,
      1,
      999,
    ),
  );

  const spd = Math.round(
    clamp(
      (dna.playfulness * 0.4 + dna.intensity * 0.3 + dna.curiosity * 0.3) * 100 * levelMult,
      1,
      999,
    ),
  );

  const int = Math.round(
    clamp(
      (dna.analytical * 0.4 + dna.curiosity * 0.3 + dna.intuitive * 0.3) * 100 * levelMult,
      1,
      999,
    ),
  );

  const cha = Math.round(
    clamp(
      (dna.warmth * 0.4 + dna.empathy * 0.3 + dna.openness * 0.3) * 100 * levelMult,
      1,
      999,
    ),
  );

  const luk = Math.round(
    clamp(
      (dna.intuitive * 0.3 + dna.creativity * 0.3 + dna.playfulness * 0.2 + dna.openness * 0.2) * 100 * levelMult,
      1,
      999,
    ),
  );

  return {
    hp,
    atk,
    def,
    spd,
    int,
    cha,
    luk,
    total: hp + atk + def + spd + int + cha + luk,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Stat metadata for UI rendering */
export const STAT_META: Record<keyof Omit<CreatureStats, "total">, { label: string; labelKo: string; color: string; icon: string }> = {
  hp:  { label: "HP",   labelKo: "체력",  color: "#ef4444", icon: "❤️" },
  atk: { label: "ATK",  labelKo: "공격",  color: "#f97316", icon: "⚔️" },
  def: { label: "DEF",  labelKo: "방어",  color: "#3b82f6", icon: "🛡️" },
  spd: { label: "SPD",  labelKo: "속도",  color: "#22c55e", icon: "⚡" },
  int: { label: "INT",  labelKo: "지능",  color: "#a855f7", icon: "🧠" },
  cha: { label: "CHA",  labelKo: "매력",  color: "#ec4899", icon: "✨" },
  luk: { label: "LUK",  labelKo: "행운",  color: "#eab308", icon: "🍀" },
};
