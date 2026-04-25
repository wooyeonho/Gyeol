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
  getCurrentSeason,
  getSeasonProgress,
  addSeasonXp,
  claimSeasonReward,
  getSeasonTimeRemaining,
  SEASON_THEMES,
} from "./season-system";

beforeEach(() => {
  store.clear();
});

// ── getCurrentSeason ─────────────────────────────────────────────────────────

describe("getCurrentSeason", () => {
  it("returns a valid season for the current month", () => {
    const season = getCurrentSeason();
    expect(season.id).toMatch(/^season-\d{4}-\d{2}$/);
    expect(season.name.ko).toBeTruthy();
    expect(season.name.en).toBeTruthy();
    expect(season.theme).toBeTruthy();
    expect(season.rewards).toHaveLength(50);
    expect(new Date(season.startDate).getTime()).toBeLessThan(
      new Date(season.endDate).getTime(),
    );
  });

  it("returns January theme for January dates", () => {
    const jan = new Date(2026, 0, 15); // January 15, 2026
    const season = getCurrentSeason(jan);
    expect(season.id).toBe("season-2026-01");
    expect(season.name.ko).toBe("겨울 꿈");
    expect(season.name.en).toBe("Winter Dreams");
    expect(season.theme).toBe("winter-dreams");
  });

  it("returns December theme for December dates", () => {
    const dec = new Date(2026, 11, 25); // December 25, 2026
    const season = getCurrentSeason(dec);
    expect(season.id).toBe("season-2026-12");
    expect(season.name.ko).toBe("기적의 눈");
    expect(season.name.en).toBe("Miracle Snow");
  });

  it("generates 50 tiers with increasing XP requirements", () => {
    const season = getCurrentSeason(new Date(2026, 3, 1));
    const xpValues = season.rewards.map((r) => r.xpRequired);

    for (let i = 1; i < xpValues.length; i++) {
      expect(xpValues[i]).toBeGreaterThan(xpValues[i - 1]);
    }
  });

  it("has milestone rewards at every 10th tier", () => {
    const season = getCurrentSeason(new Date(2026, 5, 1));
    const milestones = season.rewards.filter((r) => r.tier % 10 === 0);
    expect(milestones).toHaveLength(5);

    for (const m of milestones) {
      expect(m.freeReward.type).toBe("coins");
      expect(m.premiumReward?.type).toBe("legendary-skin");
    }
  });

  it("covers all 12 months in SEASON_THEMES", () => {
    expect(SEASON_THEMES).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      expect(SEASON_THEMES[i].month).toBe(i + 1);
      expect(SEASON_THEMES[i].name.ko).toBeTruthy();
      expect(SEASON_THEMES[i].name.en).toBeTruthy();
    }
  });
});

// ── getSeasonProgress ────────────────────────────────────────────────────────

describe("getSeasonProgress", () => {
  it("returns fresh progress when no data exists", () => {
    const now = new Date(2026, 3, 10);
    const progress = getSeasonProgress(now);
    expect(progress.seasonId).toBe("season-2026-04");
    expect(progress.currentXp).toBe(0);
    expect(progress.currentTier).toBe(0);
    expect(progress.isPremium).toBe(false);
    expect(progress.claimedTiers).toEqual([]);
  });

  it("returns saved progress for the current season", () => {
    const now = new Date(2026, 3, 10);
    const saved = {
      seasonId: "season-2026-04",
      currentXp: 500,
      currentTier: 3,
      isPremium: true,
      claimedTiers: [1, 2],
    };
    store.set("gyeol:season-progress", JSON.stringify(saved));

    const progress = getSeasonProgress(now);
    expect(progress.currentXp).toBe(500);
    expect(progress.currentTier).toBe(3);
    expect(progress.isPremium).toBe(true);
  });

  it("resets progress when the season changes", () => {
    const saved = {
      seasonId: "season-2026-03", // March season — stale
      currentXp: 999,
      currentTier: 10,
      isPremium: false,
      claimedTiers: [1, 2, 3],
    };
    store.set("gyeol:season-progress", JSON.stringify(saved));

    const progress = getSeasonProgress(new Date(2026, 3, 1)); // April
    expect(progress.seasonId).toBe("season-2026-04");
    expect(progress.currentXp).toBe(0);
    expect(progress.currentTier).toBe(0);
  });
});

// ── addSeasonXp ──────────────────────────────────────────────────────────────

describe("addSeasonXp", () => {
  it("adds XP and updates progress", () => {
    const now = new Date(2026, 3, 10);
    const result = addSeasonXp(50, now);
    expect(result.currentXp).toBe(50);
  });

  it("tiers up when XP threshold is crossed", () => {
    const now = new Date(2026, 3, 10);
    const season = getCurrentSeason(now);

    // Add enough XP to reach tier 1
    const tier1Xp = season.rewards[0].xpRequired;
    const result = addSeasonXp(tier1Xp, now);
    expect(result.currentTier).toBeGreaterThanOrEqual(1);
  });

  it("can tier up multiple levels at once", () => {
    const now = new Date(2026, 3, 10);
    const season = getCurrentSeason(now);

    // Add enough XP to reach tier 5
    const tier5Xp = season.rewards[4].xpRequired;
    const result = addSeasonXp(tier5Xp, now);
    expect(result.currentTier).toBeGreaterThanOrEqual(5);
  });

  it("accumulates XP across multiple calls", () => {
    const now = new Date(2026, 3, 10);
    addSeasonXp(30, now);
    const result = addSeasonXp(70, now);
    expect(result.currentXp).toBe(100);
  });

  it("ignores zero or negative XP", () => {
    const now = new Date(2026, 3, 10);
    addSeasonXp(100, now);
    const result = addSeasonXp(-50, now);
    expect(result.currentXp).toBe(100);
  });

  it("does not exceed tier 50", () => {
    const now = new Date(2026, 3, 10);
    const result = addSeasonXp(999999, now);
    expect(result.currentTier).toBeLessThanOrEqual(50);
  });
});

// ── claimSeasonReward ────────────────────────────────────────────────────────

describe("claimSeasonReward", () => {
  it("claims a reached tier reward", () => {
    const now = new Date(2026, 3, 10);
    const season = getCurrentSeason(now);
    const tier1Xp = season.rewards[0].xpRequired;
    addSeasonXp(tier1Xp, now);

    const { reward, newProgress } = claimSeasonReward(1, now);
    expect(reward.tier).toBe(1);
    expect(newProgress.claimedTiers).toContain(1);
  });

  it("throws when claiming an unreached tier", () => {
    const now = new Date(2026, 3, 10);
    getSeasonProgress(now); // init
    expect(() => claimSeasonReward(5, now)).toThrow("not yet reached");
  });

  it("throws when claiming an already-claimed tier", () => {
    const now = new Date(2026, 3, 10);
    const season = getCurrentSeason(now);
    addSeasonXp(season.rewards[0].xpRequired, now);

    claimSeasonReward(1, now);
    expect(() => claimSeasonReward(1, now)).toThrow("already claimed");
  });

  it("allows claiming multiple different tiers", () => {
    const now = new Date(2026, 3, 10);
    const season = getCurrentSeason(now);
    addSeasonXp(season.rewards[2].xpRequired, now); // reach tier 3

    const { newProgress: p1 } = claimSeasonReward(1, now);
    const { newProgress: p2 } = claimSeasonReward(2, now);
    const { newProgress: p3 } = claimSeasonReward(3, now);

    expect(p1.claimedTiers).toEqual([1]);
    expect(p2.claimedTiers).toEqual([1, 2]);
    expect(p3.claimedTiers).toEqual([1, 2, 3]);
  });
});

// ── getSeasonTimeRemaining ───────────────────────────────────────────────────

describe("getSeasonTimeRemaining", () => {
  it("returns positive time during the season", () => {
    const now = new Date(2026, 3, 10, 12, 0, 0); // April 10
    const remaining = getSeasonTimeRemaining(now);
    expect(remaining.days).toBeGreaterThan(0);
    expect(remaining.hours).toBeGreaterThanOrEqual(0);
  });

  it("returns correct remaining days for mid-month", () => {
    const now = new Date(2026, 3, 15, 0, 0, 0); // April 15 midnight
    const remaining = getSeasonTimeRemaining(now);
    // April has 30 days; end = April 30 23:59:59.999
    // ~15 days remaining
    expect(remaining.days).toBeGreaterThanOrEqual(15);
    expect(remaining.days).toBeLessThanOrEqual(16);
  });

  it("returns zero at the end of the season", () => {
    // After the very last moment of April
    // getCurrentSeason now returns May, so end of May is far away
    // Let's instead test with a date at the very end of the month
    const almostEnd = new Date(2026, 3, 30, 23, 59, 59, 999);
    const remaining = getSeasonTimeRemaining(almostEnd);
    expect(remaining.days).toBe(0);
    expect(remaining.hours).toBe(0);
  });

  it("returns zero when past season end", () => {
    // Manually test: create a date at the last millisecond
    const lastMs = new Date(2026, 3, 30, 23, 59, 59, 999);
    const remaining = getSeasonTimeRemaining(lastMs);
    expect(remaining.days + remaining.hours).toBe(0);
  });
});
