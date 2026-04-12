/**
 * Combo System — fighting game-inspired sequential move bonuses.
 *
 * When a creature chains specific move types in sequence, they earn
 * combo multipliers that increase damage.
 */

export type MoveType = "strike" | "guard" | "magic" | "speed" | "heal";

export interface ComboMove {
  type: MoveType;
  name: { ko: string; en: string };
  basePower: number;
}

export interface ComboResult {
  comboLength: number;
  multiplier: number;
  bonusDamage: number;
  comboName: { ko: string; en: string } | null;
}

/** Known combo sequences that grant special bonuses */
const NAMED_COMBOS: { sequence: MoveType[]; name: { ko: string; en: string }; bonusMultiplier: number }[] = [
  {
    sequence: ["strike", "strike", "strike"],
    name: { ko: "연타", en: "Triple Strike" },
    bonusMultiplier: 1.5,
  },
  {
    sequence: ["strike", "magic", "strike"],
    name: { ko: "마력 연격", en: "Arcane Rush" },
    bonusMultiplier: 1.8,
  },
  {
    sequence: ["guard", "strike", "magic"],
    name: { ko: "카운터 블래스트", en: "Counter Blast" },
    bonusMultiplier: 2.0,
  },
  {
    sequence: ["speed", "speed", "strike"],
    name: { ko: "질풍 타격", en: "Gale Strike" },
    bonusMultiplier: 1.7,
  },
  {
    sequence: ["magic", "magic", "magic"],
    name: { ko: "삼중 주문", en: "Triple Cast" },
    bonusMultiplier: 1.6,
  },
  {
    sequence: ["heal", "guard", "strike"],
    name: { ko: "반격 준비", en: "Prepared Counter" },
    bonusMultiplier: 1.4,
  },
];

/**
 * Calculate combo bonus from a sequence of recent moves.
 * Looks at the last 3 moves for named combos, or gives a basic chain bonus.
 */
export function calculateCombo(recentMoves: MoveType[]): ComboResult {
  if (recentMoves.length === 0) {
    return { comboLength: 0, multiplier: 1.0, bonusDamage: 0, comboName: null };
  }

  // Check for named combos (last 3 moves)
  if (recentMoves.length >= 3) {
    const lastThree = recentMoves.slice(-3);
    for (const combo of NAMED_COMBOS) {
      if (
        combo.sequence[0] === lastThree[0] &&
        combo.sequence[1] === lastThree[1] &&
        combo.sequence[2] === lastThree[2]
      ) {
        return {
          comboLength: 3,
          multiplier: combo.bonusMultiplier,
          bonusDamage: Math.round((combo.bonusMultiplier - 1) * 10),
          comboName: combo.name,
        };
      }
    }
  }

  // Basic chain bonus: consecutive same-type moves
  let chainLength = 1;
  for (let i = recentMoves.length - 2; i >= 0; i--) {
    if (recentMoves[i] === recentMoves[recentMoves.length - 1]) {
      chainLength++;
    } else {
      break;
    }
  }

  const multiplier = chainLength > 1 ? 1 + (chainLength - 1) * 0.15 : 1.0;

  return {
    comboLength: chainLength,
    multiplier: Math.round(multiplier * 100) / 100,
    bonusDamage: Math.round((multiplier - 1) * 10),
    comboName: null,
  };
}

/** All available moves a creature can perform in battle */
export const BATTLE_MOVES: ComboMove[] = [
  { type: "strike", name: { ko: "강타", en: "Strike" }, basePower: 12 },
  { type: "guard", name: { ko: "방어", en: "Guard" }, basePower: 0 },
  { type: "magic", name: { ko: "마법 공격", en: "Magic Blast" }, basePower: 15 },
  { type: "speed", name: { ko: "신속 공격", en: "Quick Attack" }, basePower: 8 },
  { type: "heal", name: { ko: "치유", en: "Heal" }, basePower: 0 },
];

/** Calculate final damage for a move considering combo */
export function calculateMoveDamage(
  move: ComboMove,
  combo: ComboResult,
  attackerAtk: number,
  defenderDef: number,
): number {
  const baseDamage = Math.max(1, move.basePower + attackerAtk * 0.5 - defenderDef * 0.3);
  return Math.round(baseDamage * combo.multiplier);
}
