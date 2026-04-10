import { describe, it, expect } from "vitest";
import {
  BATTLE_PASS_TIERS,
  MAX_BP_TIER,
  calculateBattlePassXP,
  getCurrentTier,
  getRewardsForTier,
  getUnclaimedRewards,
  getTotalBPProgress,
  type DailyActivities,
} from "./battle-pass";

// ── BATTLE_PASS_TIERS ───────────────────────────────────────────────────────

describe("BATTLE_PASS_TIERS", () => {
  it("has exactly 30 tiers", () => {
    expect(BATTLE_PASS_TIERS).toHaveLength(30);
  });

  it("tiers are numbered 1 through 30", () => {
    for (let i = 0; i < MAX_BP_TIER; i++) {
      expect(BATTLE_PASS_TIERS[i].tier).toBe(i + 1);
    }
  });

  it("XP requirements are strictly increasing", () => {
    for (let i = 1; i < BATTLE_PASS_TIERS.length; i++) {
      expect(BATTLE_PASS_TIERS[i].xpRequired).toBeGreaterThan(
        BATTLE_PASS_TIERS[i - 1].xpRequired,
      );
    }
  });

  it("every tier has both a free and premium reward", () => {
    for (const tier of BATTLE_PASS_TIERS) {
      expect(tier.freeReward).toBeDefined();
      expect(tier.freeReward.type).toBeTruthy();
      expect(tier.freeReward.rarity).toBeTruthy();
      expect(tier.premiumReward).toBeDefined();
      expect(tier.premiumReward.type).toBeTruthy();
      expect(tier.premiumReward.rarity).toBeTruthy();
    }
  });

  it("free track contains coins, emoji-dust, streak-freeze, and xp-boost", () => {
    const freeTypes = new Set(BATTLE_PASS_TIERS.map((t) => t.freeReward.type));
    expect(freeTypes.has("coins")).toBe(true);
    expect(freeTypes.has("emoji-dust")).toBe(true);
    expect(freeTypes.has("streak-freeze")).toBe(true);
    expect(freeTypes.has("xp-boost")).toBe(true);
  });

  it("premium track contains rare items, exclusive accessories, legendary items, and special titles", () => {
    const premiumTypes = new Set(
      BATTLE_PASS_TIERS.map((t) => t.premiumReward.type),
    );
    expect(premiumTypes.has("exclusive-accessory")).toBe(true);
    expect(premiumTypes.has("legendary-item")).toBe(true);
    expect(premiumTypes.has("special-title")).toBe(true);
    expect(premiumTypes.has("rare-emoji-pack")).toBe(true);
  });
});

// ── calculateBattlePassXP ───────────────────────────────────────────────────

describe("calculateBattlePassXP", () => {
  const base: DailyActivities = {
    challengesCompleted: 0,
    messagesSent: 0,
    creatureCareActions: 0,
    perfectDay: false,
    streakDays: 0,
  };

  it("returns 0 for no activity", () => {
    expect(calculateBattlePassXP(base)).toBe(0);
  });

  it("awards 30 XP per completed challenge", () => {
    expect(calculateBattlePassXP({ ...base, challengesCompleted: 1 })).toBe(30);
    expect(calculateBattlePassXP({ ...base, challengesCompleted: 2 })).toBe(60);
    expect(calculateBattlePassXP({ ...base, challengesCompleted: 3 })).toBe(90);
  });

  it("caps challenges at 3", () => {
    expect(calculateBattlePassXP({ ...base, challengesCompleted: 5 })).toBe(90);
  });

  it("awards perfect day bonus only when all 3 challenges are done", () => {
    // perfectDay flag true but only 2 challenges: no bonus
    const partial = calculateBattlePassXP({
      ...base,
      challengesCompleted: 2,
      perfectDay: true,
    });
    expect(partial).toBe(60); // 2*30, no bonus

    // All 3 + perfectDay
    const full = calculateBattlePassXP({
      ...base,
      challengesCompleted: 3,
      perfectDay: true,
    });
    expect(full).toBe(130); // 3*30 + 40
  });

  it("awards 2 XP per message, capped at 40 XP", () => {
    expect(calculateBattlePassXP({ ...base, messagesSent: 5 })).toBe(10);
    expect(calculateBattlePassXP({ ...base, messagesSent: 20 })).toBe(40);
    expect(calculateBattlePassXP({ ...base, messagesSent: 100 })).toBe(40); // capped
  });

  it("awards 10 XP per creature care action, capped at 30 XP", () => {
    expect(calculateBattlePassXP({ ...base, creatureCareActions: 1 })).toBe(10);
    expect(calculateBattlePassXP({ ...base, creatureCareActions: 3 })).toBe(30);
    expect(calculateBattlePassXP({ ...base, creatureCareActions: 10 })).toBe(30); // capped
  });

  it("awards streak bonus at 7+ days", () => {
    expect(calculateBattlePassXP({ ...base, streakDays: 6 })).toBe(0);
    expect(calculateBattlePassXP({ ...base, streakDays: 7 })).toBe(15);
    expect(calculateBattlePassXP({ ...base, streakDays: 30 })).toBe(15);
  });

  it("combines all XP sources correctly for a full day", () => {
    const fullDay: DailyActivities = {
      challengesCompleted: 3,
      messagesSent: 25, // capped at 40
      creatureCareActions: 5, // capped at 30
      perfectDay: true,
      streakDays: 10,
    };
    // 90 (challenges) + 40 (perfect) + 40 (msg cap) + 30 (care cap) + 15 (streak) = 215
    expect(calculateBattlePassXP(fullDay)).toBe(215);
  });

  it("handles negative values gracefully", () => {
    const negative: DailyActivities = {
      challengesCompleted: -1,
      messagesSent: -5,
      creatureCareActions: -2,
      perfectDay: false,
      streakDays: -1,
    };
    expect(calculateBattlePassXP(negative)).toBe(0);
  });
});

// ── getCurrentTier ──────────────────────────────────────────────────────────

describe("getCurrentTier", () => {
  it("returns 0 when XP is 0", () => {
    expect(getCurrentTier(0)).toBe(0);
  });

  it("returns 0 when XP is below tier 1 threshold", () => {
    expect(getCurrentTier(BATTLE_PASS_TIERS[0].xpRequired - 1)).toBe(0);
  });

  it("returns 1 when XP exactly meets tier 1", () => {
    expect(getCurrentTier(BATTLE_PASS_TIERS[0].xpRequired)).toBe(1);
  });

  it("returns 30 when XP exceeds the final tier", () => {
    const maxXP = BATTLE_PASS_TIERS[MAX_BP_TIER - 1].xpRequired;
    expect(getCurrentTier(maxXP)).toBe(30);
    expect(getCurrentTier(maxXP + 9999)).toBe(30);
  });

  it("returns correct tier for mid-range XP", () => {
    const tier15xp = BATTLE_PASS_TIERS[14].xpRequired;
    expect(getCurrentTier(tier15xp)).toBe(15);
    expect(getCurrentTier(tier15xp + 1)).toBe(15); // between 15 and 16
  });
});

// ── getRewardsForTier ───────────────────────────────────────────────────────

describe("getRewardsForTier", () => {
  it("returns only free reward for non-premium", () => {
    const rewards = getRewardsForTier(1, false);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].type).toBe(BATTLE_PASS_TIERS[0].freeReward.type);
  });

  it("returns both free and premium rewards for premium", () => {
    const rewards = getRewardsForTier(1, true);
    expect(rewards).toHaveLength(2);
    expect(rewards[0]).toEqual(BATTLE_PASS_TIERS[0].freeReward);
    expect(rewards[1]).toEqual(BATTLE_PASS_TIERS[0].premiumReward);
  });

  it("returns empty array for out-of-range tier", () => {
    expect(getRewardsForTier(0, false)).toEqual([]);
    expect(getRewardsForTier(31, true)).toEqual([]);
    expect(getRewardsForTier(-1, false)).toEqual([]);
  });
});

// ── getUnclaimedRewards ─────────────────────────────────────────────────────

describe("getUnclaimedRewards", () => {
  it("returns all rewards up to current tier when nothing claimed", () => {
    const unclaimed = getUnclaimedRewards(3, [], false);
    // 3 tiers * 1 free reward each
    expect(unclaimed).toHaveLength(3);
  });

  it("returns both tracks when premium and nothing claimed", () => {
    const unclaimed = getUnclaimedRewards(3, [], true);
    // 3 tiers * 2 rewards each
    expect(unclaimed).toHaveLength(6);
  });

  it("excludes already-claimed tiers", () => {
    const unclaimed = getUnclaimedRewards(5, [1, 3, 5], false);
    // Tiers 2 and 4 unclaimed = 2 free rewards
    expect(unclaimed).toHaveLength(2);
  });

  it("returns empty when all tiers claimed", () => {
    const unclaimed = getUnclaimedRewards(3, [1, 2, 3], false);
    expect(unclaimed).toHaveLength(0);
  });

  it("returns empty when current tier is 0", () => {
    expect(getUnclaimedRewards(0, [], true)).toHaveLength(0);
  });
});

// ── getTotalBPProgress ──────────────────────────────────────────────────────

describe("getTotalBPProgress", () => {
  it("returns tier 0 with correct xpToNext at 0 XP", () => {
    const p = getTotalBPProgress(0);
    expect(p.tier).toBe(0);
    expect(p.progress).toBe(0);
    expect(p.xpToNext).toBe(BATTLE_PASS_TIERS[0].xpRequired);
  });

  it("returns full progress at max tier", () => {
    const maxXP = BATTLE_PASS_TIERS[MAX_BP_TIER - 1].xpRequired;
    const p = getTotalBPProgress(maxXP);
    expect(p.tier).toBe(30);
    expect(p.progress).toBe(1);
    expect(p.xpToNext).toBe(0);
  });

  it("returns partial progress between tiers", () => {
    const t1xp = BATTLE_PASS_TIERS[0].xpRequired;
    const t2xp = BATTLE_PASS_TIERS[1].xpRequired;
    const midXP = t1xp + Math.floor((t2xp - t1xp) / 2);
    const p = getTotalBPProgress(midXP);
    expect(p.tier).toBe(1);
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(1);
    expect(p.xpToNext).toBe(t2xp - midXP);
  });

  it("progress is clamped between 0 and 1", () => {
    const p = getTotalBPProgress(0);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(1);

    const maxP = getTotalBPProgress(999999);
    expect(maxP.progress).toBeLessThanOrEqual(1);
  });
});
