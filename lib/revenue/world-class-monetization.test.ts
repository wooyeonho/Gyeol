import { describe, expect, it } from "vitest";
import {
  annualSavingsKRW,
  bundleEffectivePriceKRW,
  canJoinChallenge,
  CHALLENGES,
  computeARPU,
  computeCreatorPayout,
  computeMRR,
  DEFAULT_PITY,
  generateBattlePass,
  getPlan,
  isBoostActive,
  isStampBookComplete,
  PLANS,
  pityDropRate,
  planHasFeature,
  PROFILE_BOOSTS,
  resolveFeatureAccess,
  simulatePull,
  stampEvent,
  stampsUnlocked,
  type EventStampBook,
} from "./world-class-monetization";

describe("plan catalog", () => {
  it("free is free", () => {
    expect(PLANS.free.priceKRW.monthly).toBe(0);
  });
  it("annual is cheaper than 12× monthly for paid plans", () => {
    for (const id of ["pro", "premium", "family"] as const) {
      const p = getPlan(id);
      expect(p.priceKRW.annual).toBeLessThan(p.priceKRW.monthly * 12);
    }
  });
  it("annualSavingsKRW is positive for paid plans", () => {
    expect(annualSavingsKRW("pro")).toBeGreaterThan(0);
    expect(annualSavingsKRW("premium")).toBeGreaterThan(0);
  });
});

describe("resolveFeatureAccess", () => {
  it("free users cannot access voice mode", () => {
    const r = resolveFeatureAccess("free", "voice_mode");
    expect(r.allowed).toBe(false);
    expect(r.minimumPlan).toBe("premium");
  });
  it("premium users can access voice mode", () => {
    const r = resolveFeatureAccess("premium", "voice_mode");
    expect(r.allowed).toBe(true);
  });
  it("family inherits premium features", () => {
    const r = resolveFeatureAccess("family", "voice_mode");
    // family has voice via minimum-plan premium
    expect(r.minimumPlan).toBe("premium");
    expect(r.allowed).toBe(true);
  });
  it("core_chat is free", () => {
    const r = resolveFeatureAccess("free", "core_chat");
    expect(r.allowed).toBe(true);
  });
});

describe("planHasFeature", () => {
  it("pro has unlimited_memory", () => {
    expect(planHasFeature("pro", "unlimited_memory")).toBe(true);
  });
  it("free does not have unlimited_memory", () => {
    expect(planHasFeature("free", "unlimited_memory")).toBe(false);
  });
});

describe("pity system", () => {
  it("base rate below soft pity", () => {
    expect(pityDropRate(10)).toBeCloseTo(DEFAULT_PITY.baseRate);
  });
  it("guaranteed at hard pity", () => {
    expect(pityDropRate(DEFAULT_PITY.hardPityAt)).toBe(1);
  });
  it("ramps linearly in soft pity window", () => {
    const at74 = pityDropRate(DEFAULT_PITY.softPityAt);
    const at82 = pityDropRate(82);
    expect(at82).toBeGreaterThan(at74);
  });
  it("simulatePull never throws and returns hit boolean", () => {
    const res = simulatePull(80, 0.5);
    expect(typeof res.hit).toBe("boolean");
    expect(res.rate).toBeGreaterThan(0);
  });
});

describe("battle pass", () => {
  it("has 50 tiers", () => {
    expect(generateBattlePass("season-1").tiers).toHaveLength(50);
  });
  it("xp requirement is monotonic", () => {
    const { tiers } = generateBattlePass("season-1");
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].xpRequired).toBeGreaterThanOrEqual(tiers[i - 1].xpRequired);
    }
  });
});

describe("bundles", () => {
  it("applies discount", () => {
    const full = 100_000;
    const discounted = bundleEffectivePriceKRW("everything", full);
    expect(discounted).toBeLessThan(full);
    expect(discounted).toBe(70_000); // 30% off
  });
});

describe("revenue rollups", () => {
  it("MRR sums recent events only", () => {
    const now = Date.now();
    const events = [
      { userId: "a", planId: "pro" as const, amountKRW: 19_900, at: now - 1000 },
      { userId: "b", planId: "premium" as const, amountKRW: 39_900, at: now - 1000 },
      { userId: "c", planId: "pro" as const, amountKRW: 19_900, at: now - 60 * 24 * 60 * 60 * 1000 },
    ];
    const mrr = computeMRR(events, now);
    expect(mrr).toBe(19_900 + 39_900);
  });
  it("ARPU divides MRR by active users", () => {
    const now = Date.now();
    const events = [
      { userId: "a", planId: "pro" as const, amountKRW: 20_000, at: now },
      { userId: "b", planId: "pro" as const, amountKRW: 20_000, at: now },
    ];
    expect(computeARPU(events, 4, now)).toBe(10_000);
  });
  it("ARPU returns 0 for zero users", () => {
    expect(computeARPU([], 0)).toBe(0);
  });
});

describe("event stamp book (Pokemon GO)", () => {
  const book: EventStampBook = {
    campaign: "summer_bloom",
    startsAt: 0,
    endsAt: 1_000,
    stamps: [
      { id: "s1", label: "첫 대화", unlockedAt: null, rewardLabel: "코인 10" },
      { id: "s2", label: "기억 저장", unlockedAt: null, rewardLabel: "코인 20" },
    ],
  };
  it("stampsUnlocked starts at zero", () => {
    expect(stampsUnlocked(book)).toBe(0);
  });
  it("stampEvent is immutable and marks the stamp", () => {
    const next = stampEvent(book, "s1", 500);
    expect(book.stamps[0].unlockedAt).toBeNull();
    expect(next.stamps[0].unlockedAt).toBe(500);
  });
  it("isStampBookComplete requires every stamp", () => {
    const one = stampEvent(book, "s1", 1);
    expect(isStampBookComplete(one)).toBe(false);
    const both = stampEvent(one, "s2", 2);
    expect(isStampBookComplete(both)).toBe(true);
  });
});

describe("profile boost (Hinge / Bumble)", () => {
  it("has at least one spotlight boost", () => {
    expect(Object.keys(PROFILE_BOOSTS).length).toBeGreaterThan(0);
  });
  it("is active for exactly the configured duration", () => {
    const boost = PROFILE_BOOSTS.spotlight_10min;
    expect(isBoostActive("spotlight_10min", 0, boost.durationMs - 1)).toBe(true);
    expect(isBoostActive("spotlight_10min", 0, boost.durationMs + 1)).toBe(false);
  });
});

describe("creator revenue share (Roblox / Patreon)", () => {
  it("splits gross into creator + platform", () => {
    const payout = computeCreatorPayout(100_000, "sapling");
    expect(payout.creatorKRW + payout.platformKRW).toBe(100_000);
  });
  it("gives stewards the best split", () => {
    const s = computeCreatorPayout(100_000, "sapling").creatorKRW;
    const g = computeCreatorPayout(100_000, "gardener").creatorKRW;
    const w = computeCreatorPayout(100_000, "steward").creatorKRW;
    expect(w).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(s);
  });
  it("flags below-minimum payouts as ineligible", () => {
    const tiny = computeCreatorPayout(1_000, "sapling");
    expect(tiny.eligibleForPayout).toBe(false);
  });
});

describe("challenge subscription (Strava)", () => {
  it("blocks free users from paid challenges", () => {
    expect(canJoinChallenge("free", "memory_marathon")).toBe(false);
  });
  it("lets pro users join memory_marathon", () => {
    expect(canJoinChallenge("pro", "memory_marathon")).toBe(true);
  });
  it("gates mood_sunrise to premium and above", () => {
    expect(canJoinChallenge("pro", "mood_sunrise")).toBe(false);
    expect(canJoinChallenge("premium", "mood_sunrise")).toBe(true);
    expect(canJoinChallenge("family", "mood_sunrise")).toBe(true);
  });
  it("exposes a reward label for each challenge", () => {
    for (const c of Object.values(CHALLENGES)) {
      expect(c.reward.length).toBeGreaterThan(0);
    }
  });
});
