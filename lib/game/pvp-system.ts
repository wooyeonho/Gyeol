/**
 * PvP Matchmaking & Ranking System — Elo-style competitive battles.
 *
 * Features:
 * - Elo-style rating (start at 1000)
 * - Matchmaking within +-200 rating range
 * - Battle resolution: creature stats + type advantage + ~15% RNG variance
 * - Season soft resets: (rating - 1000) / 2 + 1000
 */

import type { CreatureStats } from "./stat-system";
import type { DominantType } from "./type-advantage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleCreature {
  name: string;
  stats: CreatureStats;
  dominantType: DominantType;
  level: number;
}

export interface BattleHighlight {
  type: "critical_hit" | "type_advantage" | "type_disadvantage" | "speed_initiative" | "underdog_surge";
  message: { ko: string; en: string };
}

export interface BattleOutcome {
  winner: BattleCreature;
  loser: BattleCreature;
  ratingChange: number;
  highlights: BattleHighlight[];
  winnerDamageDealt: number;
  loserDamageDealt: number;
}

export interface MatchCandidate {
  id: string;
  name: string;
  rating: number;
}

// ---------------------------------------------------------------------------
// Type advantage matrix (mirrors type-advantage.ts logic)
// ---------------------------------------------------------------------------

const TYPE_ADVANTAGE: Record<DominantType, DominantType[]> = {
  analytical: ["creative"],
  creative: ["social"],
  social: ["emotional"],
  emotional: ["analytical"],
  balanced: [],
};

const TYPE_WEAKNESS: Record<DominantType, DominantType[]> = {
  analytical: ["emotional"],
  creative: ["analytical"],
  social: ["creative"],
  emotional: ["social"],
  balanced: [],
};

/** Returns a type-advantage multiplier between two dominant types. */
function getTypeMultiplier(attacker: DominantType, defender: DominantType): {
  multiplier: number;
  highlight: BattleHighlight | null;
} {
  if (TYPE_ADVANTAGE[attacker]?.includes(defender)) {
    return {
      multiplier: 1.5,
      highlight: {
        type: "type_advantage",
        message: {
          ko: `${attacker} 타입이 ${defender} 타입에 효과적!`,
          en: `${attacker} type is super effective against ${defender}!`,
        },
      },
    };
  }
  if (TYPE_WEAKNESS[attacker]?.includes(defender)) {
    return {
      multiplier: 0.67,
      highlight: {
        type: "type_disadvantage",
        message: {
          ko: `${attacker} 타입이 ${defender} 타입에 효과 약함...`,
          en: `${attacker} type is not very effective against ${defender}...`,
        },
      },
    };
  }
  return { multiplier: 1.0, highlight: null };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_K_FACTOR = 32;
const MATCHMAKING_RANGE = 200;
const RNG_VARIANCE = 0.15; // +/-15%
const CRITICAL_HIT_THRESHOLD = 0.92; // top 8% of RNG rolls = critical hit

// ---------------------------------------------------------------------------
// Seeded / injectable RNG (for testability)
// ---------------------------------------------------------------------------

let rngFn: () => number = Math.random;

/** Override the RNG function (useful for deterministic tests). */
export function setRng(fn: () => number): void {
  rngFn = fn;
}

/** Reset RNG to Math.random. */
export function resetRng(): void {
  rngFn = Math.random;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate the result of a battle between two creatures.
 *
 * Damage formula per creature:
 *   baseDamage = ATK * typeMultiplier - DEF * 0.5
 *   rngFactor  = 1 + (rng - 0.5) * 2 * RNG_VARIANCE   (range: 0.85 .. 1.15)
 *   finalDamage = baseDamage * rngFactor * levelScaling
 *
 * Initiative: the faster creature (SPD) attacks first, gaining a 10% bonus.
 * If SPD ties, it is a coin-flip.
 *
 * The creature dealing more final damage wins.
 */
export function calculateBattleResult(
  attacker: BattleCreature,
  defender: BattleCreature,
): BattleOutcome {
  const highlights: BattleHighlight[] = [];

  // --- Type advantage ---
  const atkType = getTypeMultiplier(attacker.dominantType, defender.dominantType);
  const defType = getTypeMultiplier(defender.dominantType, attacker.dominantType);

  if (atkType.highlight) highlights.push(atkType.highlight);
  if (defType.highlight) highlights.push(defType.highlight);

  // --- Speed / initiative ---
  const attackerFirst =
    attacker.stats.spd > defender.stats.spd
      ? true
      : attacker.stats.spd < defender.stats.spd
        ? false
        : rngFn() >= 0.5;

  const initiativeBonus = 1.1;

  if (attackerFirst) {
    highlights.push({
      type: "speed_initiative",
      message: {
        ko: `${attacker.name}이(가) 선공!`,
        en: `${attacker.name} strikes first!`,
      },
    });
  } else {
    highlights.push({
      type: "speed_initiative",
      message: {
        ko: `${defender.name}이(가) 선공!`,
        en: `${defender.name} strikes first!`,
      },
    });
  }

  // --- Level scaling (2% per level) ---
  const attackerLevelScale = 1 + (attacker.level - 1) * 0.02;
  const defenderLevelScale = 1 + (defender.level - 1) * 0.02;

  // --- RNG rolls ---
  const atkRng = 1 + (rngFn() - 0.5) * 2 * RNG_VARIANCE;
  const defRng = 1 + (rngFn() - 0.5) * 2 * RNG_VARIANCE;

  // --- Critical hit detection ---
  if (atkRng >= 1 + (CRITICAL_HIT_THRESHOLD - 0.5) * 2 * RNG_VARIANCE) {
    highlights.push({
      type: "critical_hit",
      message: {
        ko: `${attacker.name}의 치명타!`,
        en: `${attacker.name} lands a critical hit!`,
      },
    });
  }
  if (defRng >= 1 + (CRITICAL_HIT_THRESHOLD - 0.5) * 2 * RNG_VARIANCE) {
    highlights.push({
      type: "critical_hit",
      message: {
        ko: `${defender.name}의 치명타!`,
        en: `${defender.name} lands a critical hit!`,
      },
    });
  }

  // --- Damage calculation ---
  const attackerBaseDamage = Math.max(
    1,
    attacker.stats.atk * atkType.multiplier - defender.stats.def * 0.5,
  );
  const defenderBaseDamage = Math.max(
    1,
    defender.stats.atk * defType.multiplier - attacker.stats.def * 0.5,
  );

  const attackerDamage =
    attackerBaseDamage *
    atkRng *
    attackerLevelScale *
    (attackerFirst ? initiativeBonus : 1);

  const defenderDamage =
    defenderBaseDamage *
    defRng *
    defenderLevelScale *
    (attackerFirst ? 1 : initiativeBonus);

  // --- Wisdom adds a small defensive bonus (reduces incoming damage) ---
  const attackerFinal = attackerDamage * (1 + attacker.stats.wis * 0.002);
  const defenderFinal = defenderDamage * (1 + defender.stats.wis * 0.002);

  // --- Determine winner ---
  const attackerWins = attackerFinal >= defenderFinal;

  const winner = attackerWins ? attacker : defender;
  const loser = attackerWins ? defender : attacker;
  const winnerDamage = attackerWins ? attackerFinal : defenderFinal;
  const loserDamage = attackerWins ? defenderFinal : attackerFinal;

  // --- Underdog surge highlight ---
  const totalPowerAttacker =
    attacker.stats.hp + attacker.stats.atk + attacker.stats.def +
    attacker.stats.spd + attacker.stats.wis + attacker.stats.cha;
  const totalPowerDefender =
    defender.stats.hp + defender.stats.atk + defender.stats.def +
    defender.stats.spd + defender.stats.wis + defender.stats.cha;

  const winnerPower = attackerWins ? totalPowerAttacker : totalPowerDefender;
  const loserPower = attackerWins ? totalPowerDefender : totalPowerAttacker;

  if (winnerPower < loserPower * 0.85) {
    highlights.push({
      type: "underdog_surge",
      message: {
        ko: `${winner.name}의 역전승!`,
        en: `${winner.name} pulls off an upset victory!`,
      },
    });
  }

  // --- Rating change (use default K) ---
  const ratingChange = DEFAULT_K_FACTOR; // Placeholder; real ELO applied externally

  return {
    winner,
    loser,
    ratingChange,
    highlights,
    winnerDamageDealt: Math.round(winnerDamage * 100) / 100,
    loserDamageDealt: Math.round(loserDamage * 100) / 100,
  };
}

/**
 * Classic Elo rating update.
 *
 * Expected score: E = 1 / (1 + 10^((opponent - player) / 400))
 * New rating: R' = R + K * (S - E)
 *   where S = 1 for win, 0 for loss.
 */
export function updateEloRating(
  winner: number,
  loser: number,
  kFactor: number = DEFAULT_K_FACTOR,
): { newWinner: number; newLoser: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loser - winner) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winner - loser) / 400));

  const newWinner = Math.round(winner + kFactor * (1 - expectedWinner));
  const newLoser = Math.max(0, Math.round(loser + kFactor * (0 - expectedLoser)));

  return { newWinner, newLoser };
}

/**
 * Find the best match within +-200 rating from a pool of candidates.
 * Returns the closest-rated candidate, or null if none is within range.
 */
export function findMatch(
  rating: number,
  pool: MatchCandidate[],
): MatchCandidate | null {
  let best: MatchCandidate | null = null;
  let bestDiff = Infinity;

  for (const candidate of pool) {
    const diff = Math.abs(candidate.rating - rating);
    if (diff <= MATCHMAKING_RANGE && diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }

  return best;
}

/**
 * Season soft-reset: pull rating halfway back toward 1000.
 * Formula: (rating - 1000) / 2 + 1000
 */
export function softResetRating(rating: number): number {
  return Math.round((rating - 1000) / 2 + 1000);
}

/**
 * Map a numeric rating to a rank title with Korean/English labels and tier name.
 *
 * Thresholds:
 *   <800  : Bronze
 *   <1000 : Silver
 *   <1200 : Gold
 *   <1500 : Diamond
 *   <2000 : Master
 *   2000+ : Legend
 */
export function getRankTitle(rating: number): { ko: string; en: string; tier: string } {
  if (rating >= 2000) return { ko: "전설", en: "Legend", tier: "legend" };
  if (rating >= 1500) return { ko: "마스터", en: "Master", tier: "master" };
  if (rating >= 1200) return { ko: "다이아몬드", en: "Diamond", tier: "diamond" };
  if (rating >= 1000) return { ko: "골드", en: "Gold", tier: "gold" };
  if (rating >= 800) return { ko: "실버", en: "Silver", tier: "silver" };
  return { ko: "브론즈", en: "Bronze", tier: "bronze" };
}
