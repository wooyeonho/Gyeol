import { describe, expect, it, afterEach } from "vitest";
import {
  calculateBattleResult,
  updateEloRating,
  findMatch,
  softResetRating,
  getRankTitle,
  setRng,
  resetRng,
} from "./pvp-system";
import type { BattleCreature, MatchCandidate } from "./pvp-system";
import type { CreatureStats } from "./stat-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(overrides: Partial<CreatureStats> = {}): CreatureStats {
  return { hp: 50, atk: 50, def: 50, spd: 50, wis: 50, cha: 50, ...overrides };
}

function makeCreature(overrides: Partial<BattleCreature> = {}): BattleCreature {
  return {
    name: "TestCreature",
    stats: makeStats(),
    dominantType: "balanced",
    level: 5,
    ...overrides,
  };
}

afterEach(() => {
  resetRng();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pvp-system", () => {
  // ---- updateEloRating ----

  it("updateEloRating: equal ratings yield ~+16 / -16 change", () => {
    const { newWinner, newLoser } = updateEloRating(1000, 1000);
    expect(newWinner).toBe(1016);
    expect(newLoser).toBe(984);
  });

  it("updateEloRating: beating a higher-rated player gives more points", () => {
    const upset = updateEloRating(800, 1200);
    const expected = updateEloRating(1200, 800);
    expect(upset.newWinner - 800).toBeGreaterThan(expected.newWinner - 1200);
  });

  it("updateEloRating: loser rating never goes below 0", () => {
    const { newLoser } = updateEloRating(1000, 5);
    expect(newLoser).toBeGreaterThanOrEqual(0);
  });

  it("updateEloRating: custom kFactor changes magnitude", () => {
    const k16 = updateEloRating(1000, 1000, 16);
    const k64 = updateEloRating(1000, 1000, 64);
    expect(k64.newWinner - 1000).toBeGreaterThan(k16.newWinner - 1000);
  });

  // ---- findMatch ----

  it("findMatch: returns closest candidate within +-200", () => {
    const pool: MatchCandidate[] = [
      { id: "a", name: "A", rating: 900 },
      { id: "b", name: "B", rating: 1050 },
      { id: "c", name: "C", rating: 1300 },
    ];
    const match = findMatch(1000, pool);
    expect(match).not.toBeNull();
    expect(match!.id).toBe("b");
  });

  it("findMatch: returns null when no candidate is within range", () => {
    const pool: MatchCandidate[] = [
      { id: "a", name: "Far", rating: 500 },
      { id: "b", name: "Farther", rating: 1500 },
    ];
    const match = findMatch(1000, pool);
    expect(match).toBeNull();
  });

  it("findMatch: handles empty pool", () => {
    expect(findMatch(1000, [])).toBeNull();
  });

  it("findMatch: boundary — candidate exactly 200 away is included", () => {
    const pool: MatchCandidate[] = [{ id: "edge", name: "Edge", rating: 1200 }];
    const match = findMatch(1000, pool);
    expect(match).not.toBeNull();
    expect(match!.id).toBe("edge");
  });

  it("findMatch: boundary — candidate 201 away is excluded", () => {
    const pool: MatchCandidate[] = [{ id: "edge", name: "Edge", rating: 1201 }];
    const match = findMatch(1000, pool);
    expect(match).toBeNull();
  });

  // ---- softResetRating ----

  it("softResetRating: 1000 stays 1000", () => {
    expect(softResetRating(1000)).toBe(1000);
  });

  it("softResetRating: 1500 becomes 1250", () => {
    expect(softResetRating(1500)).toBe(1250);
  });

  it("softResetRating: 600 becomes 800", () => {
    expect(softResetRating(600)).toBe(800);
  });

  it("softResetRating: 2000 becomes 1500", () => {
    expect(softResetRating(2000)).toBe(1500);
  });

  // ---- getRankTitle ----

  it("getRankTitle: <800 is Bronze", () => {
    const rank = getRankTitle(700);
    expect(rank.tier).toBe("bronze");
    expect(rank.en).toBe("Bronze");
    expect(rank.ko).toBe("브론즈");
  });

  it("getRankTitle: 800 is Silver", () => {
    expect(getRankTitle(800).tier).toBe("silver");
  });

  it("getRankTitle: 1000 is Gold", () => {
    expect(getRankTitle(1000).tier).toBe("gold");
  });

  it("getRankTitle: 1200 is Diamond", () => {
    expect(getRankTitle(1200).tier).toBe("diamond");
  });

  it("getRankTitle: 1500 is Master", () => {
    expect(getRankTitle(1500).tier).toBe("master");
  });

  it("getRankTitle: 2000+ is Legend", () => {
    const rank = getRankTitle(2500);
    expect(rank.tier).toBe("legend");
    expect(rank.en).toBe("Legend");
    expect(rank.ko).toBe("전설");
  });

  // ---- calculateBattleResult ----

  it("calculateBattleResult: stronger creature wins with deterministic RNG", () => {
    // Seed RNG to always return 0.5 (neutral)
    setRng(() => 0.5);

    const strong = makeCreature({
      name: "Strong",
      stats: makeStats({ atk: 90, def: 70, spd: 60, wis: 50 }),
      dominantType: "analytical",
    });
    const weak = makeCreature({
      name: "Weak",
      stats: makeStats({ atk: 30, def: 20, spd: 40, wis: 30 }),
      dominantType: "balanced",
    });

    const result = calculateBattleResult(strong, weak);
    expect(result.winner.name).toBe("Strong");
    expect(result.loser.name).toBe("Weak");
    expect(result.winnerDamageDealt).toBeGreaterThan(result.loserDamageDealt);
  });

  it("calculateBattleResult: type advantage can flip the outcome", () => {
    setRng(() => 0.5);

    // Analytical beats Creative
    const analyticalCreature = makeCreature({
      name: "Analyst",
      stats: makeStats({ atk: 50, def: 50, spd: 50 }),
      dominantType: "analytical",
    });
    const creativeCreature = makeCreature({
      name: "Artist",
      stats: makeStats({ atk: 50, def: 50, spd: 50 }),
      dominantType: "creative",
    });

    const result = calculateBattleResult(analyticalCreature, creativeCreature);
    expect(result.winner.name).toBe("Analyst");
    // Should contain type advantage highlight
    const typeHighlight = result.highlights.find(h => h.type === "type_advantage");
    expect(typeHighlight).toBeDefined();
  });

  it("calculateBattleResult: speed determines initiative", () => {
    setRng(() => 0.5);

    const fast = makeCreature({
      name: "Speedster",
      stats: makeStats({ spd: 90 }),
    });
    const slow = makeCreature({
      name: "Sluggish",
      stats: makeStats({ spd: 10 }),
    });

    const result = calculateBattleResult(fast, slow);
    const initHighlight = result.highlights.find(h => h.type === "speed_initiative");
    expect(initHighlight).toBeDefined();
    expect(initHighlight!.message.en).toContain("Speedster");
  });

  it("calculateBattleResult: high RNG can produce critical hit highlight", () => {
    // Make RNG return a high value for the attacker
    let call = 0;
    setRng(() => {
      call++;
      // 1st call: speed tie coin flip
      // 2nd call: attacker RNG (high = crit)
      // 3rd call: defender RNG (normal)
      if (call === 2) return 0.99;
      return 0.5;
    });

    const a = makeCreature({ name: "Critter" });
    const b = makeCreature({ name: "Target" });

    const result = calculateBattleResult(a, b);
    const critHighlight = result.highlights.find(h => h.type === "critical_hit");
    expect(critHighlight).toBeDefined();
    expect(critHighlight!.message.en).toContain("Critter");
  });

  it("calculateBattleResult: RNG variance allows underdog wins", () => {
    // Give the weak creature high RNG and speed advantage, strong creature low RNG
    let call = 0;
    setRng(() => {
      call++;
      // No speed coin-flip needed (David has higher SPD)
      // call 1: attacker (Goliath) RNG → very low
      // call 2: defender (David) RNG → very high
      if (call === 1) return 0.01; // Goliath gets bad luck
      if (call === 2) return 0.99; // David gets great luck
      return 0.5;
    });

    const strong = makeCreature({
      name: "Goliath",
      stats: makeStats({ atk: 55, def: 45, spd: 40, wis: 40 }),
    });
    const weak = makeCreature({
      name: "David",
      stats: makeStats({ atk: 48, def: 42, spd: 60, wis: 45 }),
    });

    const result = calculateBattleResult(strong, weak);
    // David has SPD advantage (initiative bonus) + extreme RNG luck
    expect(result.winner.name).toBe("David");
  });

  it("calculateBattleResult: returns highlights array", () => {
    setRng(() => 0.5);
    const a = makeCreature({ name: "Alpha" });
    const b = makeCreature({ name: "Beta" });
    const result = calculateBattleResult(a, b);
    expect(Array.isArray(result.highlights)).toBe(true);
    expect(result.highlights.length).toBeGreaterThan(0);
    // At minimum there should be a speed initiative highlight
    expect(result.highlights.some(h => h.type === "speed_initiative")).toBe(true);
  });

  it("calculateBattleResult: damage values are positive", () => {
    setRng(() => 0.5);
    const a = makeCreature();
    const b = makeCreature();
    const result = calculateBattleResult(a, b);
    expect(result.winnerDamageDealt).toBeGreaterThan(0);
    expect(result.loserDamageDealt).toBeGreaterThan(0);
  });
});
