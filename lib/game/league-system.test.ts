import { describe, it, expect, beforeEach } from "vitest";

// ── Mock localStorage ────────────────────────────────────────────────────────

const store = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  },
  writable: true,
});

Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
});

import {
  calculateLeaguePoints,
  getCurrentTier,
  getPromotionStatus,
  getLeagueProgress,
  getLeagueState,
  addLeaguePoints,
  getTierInfo,
  TIER_CONFIG,
  TIERS_ORDERED,
  POINT_VALUES,
  getWeekId,
  type Tier,
} from "./league-system";

beforeEach(() => {
  store.clear();
});

// ── calculateLeaguePoints ───────────────────────────────────────────────────

describe("calculateLeaguePoints", () => {
  it("calculates points from daily challenges", () => {
    const result = calculateLeaguePoints({ dailyChallenges: 3 });
    expect(result.dailyChallenges).toBe(3 * POINT_VALUES.dailyChallenge);
    expect(result.total).toBe(3 * POINT_VALUES.dailyChallenge);
  });

  it("calculates points from streak days", () => {
    const result = calculateLeaguePoints({ streakDays: 7 });
    expect(result.streakDays).toBe(7 * POINT_VALUES.streakDay);
    expect(result.total).toBe(7 * POINT_VALUES.streakDay);
  });

  it("calculates points from messages sent", () => {
    const result = calculateLeaguePoints({ messagesSent: 50 });
    expect(result.messagesSent).toBe(50 * POINT_VALUES.messageSent);
    expect(result.total).toBe(50 * POINT_VALUES.messageSent);
  });

  it("sums all activity types", () => {
    const result = calculateLeaguePoints({
      dailyChallenges: 2,
      streakDays: 5,
      messagesSent: 20,
    });
    const expected =
      2 * POINT_VALUES.dailyChallenge +
      5 * POINT_VALUES.streakDay +
      20 * POINT_VALUES.messageSent;
    expect(result.total).toBe(expected);
  });

  it("returns zero for empty input", () => {
    const result = calculateLeaguePoints({});
    expect(result.total).toBe(0);
  });

  it("treats negative values as zero", () => {
    const result = calculateLeaguePoints({
      dailyChallenges: -5,
      streakDays: -3,
      messagesSent: -10,
    });
    expect(result.total).toBe(0);
  });
});

// ── getCurrentTier ──────────────────────────────────────────────────────────

describe("getCurrentTier", () => {
  it("returns bronze for 0 points", () => {
    expect(getCurrentTier(0)).toBe("bronze");
  });

  it("returns silver at 100 points", () => {
    expect(getCurrentTier(100)).toBe("silver");
  });

  it("returns gold at 300 points", () => {
    expect(getCurrentTier(300)).toBe("gold");
  });

  it("returns diamond at 600 points", () => {
    expect(getCurrentTier(600)).toBe("diamond");
  });

  it("returns master at 1000 points", () => {
    expect(getCurrentTier(1000)).toBe("master");
  });

  it("returns legend at 1800 points", () => {
    expect(getCurrentTier(1800)).toBe("legend");
  });

  it("returns correct tier for values between thresholds", () => {
    expect(getCurrentTier(50)).toBe("bronze");
    expect(getCurrentTier(250)).toBe("silver");
    expect(getCurrentTier(500)).toBe("gold");
    expect(getCurrentTier(800)).toBe("diamond");
    expect(getCurrentTier(1500)).toBe("master");
    expect(getCurrentTier(5000)).toBe("legend");
  });

  it("handles negative points gracefully", () => {
    // Negative is below any threshold, no tier matches after bronze at 0
    // bronze threshold is 0, -10 < 0 so bronze doesn't match via >=
    // However our loop: if points >= 0 -> result = bronze, if points >= 100 -> silver...
    // -10 < 0 so bronze is never assigned by the loop... Let's check
    // Actually the initial result is "bronze" so it stays bronze.
    expect(getCurrentTier(-10)).toBe("bronze");
  });
});

// ── getLeagueState ──────────────────────────────────────────────────────────

describe("getLeagueState", () => {
  it("returns default bronze state when no data exists", () => {
    const state = getLeagueState();
    expect(state.tier).toBe("bronze");
    expect(state.points).toBe(0);
    expect(state.weeklyPoints).toBe(0);
  });

  it("persists state to localStorage", () => {
    getLeagueState();
    const raw = store.get("gyeol:league-state");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.tier).toBe("bronze");
  });

  it("returns saved state if week has not changed", () => {
    const now = new Date(2026, 3, 6);
    const state = getLeagueState(now);
    state.points = 250;
    store.set("gyeol:league-state", JSON.stringify(state));

    const loaded = getLeagueState(now);
    expect(loaded.points).toBe(250);
  });

  it("resets weekly points on new week but preserves tier and total points", () => {
    const week1 = new Date(2026, 3, 6); // a Monday
    addLeaguePoints(200, week1);
    const stateW1 = getLeagueState(week1);
    expect(stateW1.weeklyPoints).toBe(200);
    expect(stateW1.points).toBe(200);

    // Advance to next week
    const week2 = new Date(2026, 3, 13);
    const stateW2 = getLeagueState(week2);
    expect(stateW2.weeklyPoints).toBe(0);
    expect(stateW2.points).toBe(200); // total preserved
  });
});

// ── addLeaguePoints ─────────────────────────────────────────────────────────

describe("addLeaguePoints", () => {
  it("adds points and updates state", () => {
    const now = new Date(2026, 3, 6);
    const result = addLeaguePoints(50, now);
    expect(result.points).toBe(50);
    expect(result.weeklyPoints).toBe(50);
  });

  it("accumulates points across multiple calls", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(30, now);
    const result = addLeaguePoints(70, now);
    expect(result.points).toBe(100);
    expect(result.weeklyPoints).toBe(100);
  });

  it("ignores zero or negative points", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(100, now);
    const result = addLeaguePoints(-50, now);
    expect(result.points).toBe(100);
  });
});

// ── getPromotionStatus ──────────────────────────────────────────────────────

describe("getPromotionStatus", () => {
  it("promotes when points exceed next tier threshold", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(100, now); // silver threshold
    const result = getPromotionStatus(now);
    expect(result.status).toBe("promoted");
    expect(result.currentTier).toBe("silver");
    expect(result.previousTier).toBe("bronze");
  });

  it("stays when points are within current tier", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(50, now); // below silver threshold
    const result = getPromotionStatus(now);
    // With 50 points, rank = max(1, floor(50 - 50/50)) = max(1, 49) = 49
    // percentile = 49/200 = 0.245, which is <= 0.3 (promotion zone)
    // But next tier (silver) requires 100 points, and we only have 50
    // So the rank-based promotion path won't trigger either
    expect(result.currentTier).toBe("bronze");
  });

  it("does not demote from bronze", () => {
    const now = new Date(2026, 3, 6);
    getLeagueState(now); // bronze with 0 points
    const result = getPromotionStatus(now);
    expect(result.status).not.toBe("demoted");
    expect(result.currentTier).toBe("bronze");
  });

  it("promotes one step at a time", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(600, now); // diamond threshold
    const r1 = getPromotionStatus(now);
    expect(r1.status).toBe("promoted");
    expect(r1.currentTier).toBe("silver"); // one step from bronze

    const r2 = getPromotionStatus(now);
    expect(r2.status).toBe("promoted");
    expect(r2.currentTier).toBe("gold"); // one step from silver

    const r3 = getPromotionStatus(now);
    expect(r3.status).toBe("promoted");
    expect(r3.currentTier).toBe("diamond"); // one step from gold
  });

  it("demotes when in bottom zone with previous tier available", () => {
    const now = new Date(2026, 3, 6);
    // Manually set to silver with very low points (in demotion zone)
    const state = getLeagueState(now);
    state.tier = "silver";
    state.points = 100; // at threshold, rank will be high
    state.rank = 140;   // high rank = bad position
    state.totalParticipants = 150;
    store.set("gyeol:league-state", JSON.stringify(state));

    const result = getPromotionStatus(now);
    // percentile = 140/150 = 0.933, which is >= 0.9 (demotion zone)
    expect(result.status).toBe("demoted");
    expect(result.currentTier).toBe("bronze");
  });
});

// ── getLeagueProgress ───────────────────────────────────────────────────────

describe("getLeagueProgress", () => {
  it("returns progress within current tier", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(50, now); // halfway through bronze (0-100)
    const progress = getLeagueProgress(now);
    expect(progress.currentTier).toBe("bronze");
    expect(progress.nextTier).toBe("silver");
    expect(progress.currentPoints).toBe(50);
    expect(progress.pointsForNextTier).toBe(100);
    expect(progress.progressPercent).toBe(50);
  });

  it("returns 0% at start of tier", () => {
    const now = new Date(2026, 3, 6);
    const progress = getLeagueProgress(now);
    expect(progress.progressPercent).toBe(0);
  });

  it("caps progress at 100%", () => {
    const now = new Date(2026, 3, 6);
    // Manually set to bronze with 150 points (over the 100 threshold)
    addLeaguePoints(150, now);
    const progress = getLeagueProgress(now);
    expect(progress.progressPercent).toBe(100);
  });

  it("returns null nextTier for legend", () => {
    const now = new Date(2026, 3, 6);
    addLeaguePoints(2000, now);
    // Promote through tiers
    for (let i = 0; i < 5; i++) getPromotionStatus(now);
    const progress = getLeagueProgress(now);
    expect(progress.currentTier).toBe("legend");
    expect(progress.nextTier).toBeNull();
  });

  it("has correct tier sequence", () => {
    expect(TIERS_ORDERED).toEqual([
      "bronze", "silver", "gold", "diamond", "master", "legend",
    ]);
  });
});

// ── getTierInfo ─────────────────────────────────────────────────────────────

describe("getTierInfo", () => {
  it("returns correct info for each tier", () => {
    const tiers: Tier[] = ["bronze", "silver", "gold", "diamond", "master", "legend"];
    for (const tier of tiers) {
      const info = getTierInfo(tier);
      expect(info.tier).toBe(tier);
      expect(info.label.ko).toBeTruthy();
      expect(info.label.en).toBeTruthy();
      expect(info.color).toMatch(/^#/);
      expect(info.icon).toBeTruthy();
      expect(typeof info.pointThreshold).toBe("number");
    }
  });

  it("has increasing pointThresholds across tiers", () => {
    let prev = -1;
    for (const tier of TIERS_ORDERED) {
      const info = getTierInfo(tier);
      expect(info.pointThreshold).toBeGreaterThan(prev);
      prev = info.pointThreshold;
    }
  });

  it("TIER_CONFIG contains all six tiers", () => {
    expect(Object.keys(TIER_CONFIG)).toHaveLength(6);
  });
});

// ── getWeekId ───────────────────────────────────────────────────────────────

describe("getWeekId", () => {
  it("returns a string in YYYY-WNN format", () => {
    const weekId = getWeekId(new Date(2026, 3, 6));
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("returns the same ID for dates in the same week", () => {
    const mon = new Date(2026, 3, 6); // Monday
    const wed = new Date(2026, 3, 8); // Wednesday
    expect(getWeekId(mon)).toBe(getWeekId(wed));
  });

  it("returns different IDs for different weeks", () => {
    const w1 = new Date(2026, 3, 6);
    const w2 = new Date(2026, 3, 13);
    expect(getWeekId(w1)).not.toBe(getWeekId(w2));
  });
});
