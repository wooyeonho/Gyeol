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
  getLadderState,
  addLadderPoints,
  checkPromotion,
  resetWeeklyLadder,
  getLeagueInfo,
  LEAGUE_CONFIG,
  type League,
} from "./ladder-system";

beforeEach(() => {
  store.clear();
});

// ── getLadderState ───────────────────────────────────────────────────────────

describe("getLadderState", () => {
  it("returns default bronze state when no data exists", () => {
    const state = getLadderState();
    expect(state.league).toBe("bronze");
    expect(state.points).toBe(0);
    expect(state.weeklyXp).toBe(0);
    expect(state.promotionZone).toBe(false);
  });

  it("persists state to localStorage", () => {
    getLadderState();
    const raw = store.get("gyeol:ladder-state");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.league).toBe("bronze");
  });

  it("returns saved state if week has not changed", () => {
    const now = new Date(2026, 3, 6); // a Monday
    const state = getLadderState(now);
    state.points = 250;
    store.set("gyeol:ladder-state", JSON.stringify(state));

    const loaded = getLadderState(now);
    expect(loaded.points).toBe(250);
  });
});

// ── addLadderPoints ──────────────────────────────────────────────────────────

describe("addLadderPoints", () => {
  it("adds points and updates state", () => {
    const now = new Date(2026, 3, 6);
    const result = addLadderPoints(50, now);
    expect(result.points).toBe(50);
    expect(result.weeklyXp).toBe(50);
  });

  it("accumulates points across multiple calls", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(30, now);
    const result = addLadderPoints(70, now);
    expect(result.points).toBe(100);
    expect(result.weeklyXp).toBe(100);
  });

  it("ignores zero or negative points", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(100, now);
    const result = addLadderPoints(-50, now);
    expect(result.points).toBe(100);
  });

  it("updates rank when points increase", () => {
    const now = new Date(2026, 3, 6);
    const before = getLadderState(now);
    addLadderPoints(200, now);
    const after = getLadderState(now);
    // Higher points → lower (better) rank number
    expect(after.rank).toBeLessThanOrEqual(before.rank);
  });

  it("enters promotion zone near tier threshold", () => {
    const now = new Date(2026, 3, 6);
    // Bronze goes 0-100; promotion zone is top 20% → 80+
    addLadderPoints(90, now);
    const state = getLadderState(now);
    expect(state.promotionZone).toBe(true);
  });
});

// ── checkPromotion ───────────────────────────────────────────────────────────

describe("checkPromotion", () => {
  it("promotes from bronze to silver at 100 points", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(100, now);
    const result = checkPromotion(now);
    expect(result.promoted).toBe(true);
    expect(result.newLeague).toBe("silver");
  });

  it("does not promote when below threshold", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(50, now);
    const result = checkPromotion(now);
    expect(result.promoted).toBe(false);
    expect(result.newLeague).toBe("bronze");
  });

  it("promotes through multiple leagues at once", () => {
    const now = new Date(2026, 3, 6);
    // Gold requires 300 points
    addLadderPoints(300, now);
    // checkPromotion only advances one league at a time
    const r1 = checkPromotion(now);
    expect(r1.promoted).toBe(true);
    expect(r1.newLeague).toBe("silver");

    // Check again to promote to gold
    const r2 = checkPromotion(now);
    expect(r2.promoted).toBe(true);
    expect(r2.newLeague).toBe("gold");
  });

  it("demotes when points fall below league minimum", () => {
    const now = new Date(2026, 3, 6);
    // Manually set to silver with low points
    const state = getLadderState(now);
    state.league = "silver";
    state.points = 50; // below silver min of 100
    store.set("gyeol:ladder-state", JSON.stringify(state));

    const result = checkPromotion(now);
    expect(result.demoted).toBe(true);
    expect(result.newLeague).toBe("bronze");
  });

  it("does not demote from bronze", () => {
    const now = new Date(2026, 3, 6);
    getLadderState(now); // bronze with 0 points
    const result = checkPromotion(now);
    expect(result.demoted).toBe(false);
    expect(result.newLeague).toBe("bronze");
  });
});

// ── resetWeeklyLadder ────────────────────────────────────────────────────────

describe("resetWeeklyLadder", () => {
  it("resets weekly XP to zero", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(200, now);
    expect(getLadderState(now).weeklyXp).toBe(200);

    resetWeeklyLadder(now);
    const state = getLadderState(now);
    expect(state.weeklyXp).toBe(0);
  });

  it("preserves league after reset", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(100, now);
    checkPromotion(now); // promote to silver

    resetWeeklyLadder(now);
    const state = getLadderState(now);
    expect(state.league).toBe("silver");
  });

  it("preserves accumulated points after reset", () => {
    const now = new Date(2026, 3, 6);
    addLadderPoints(150, now);
    resetWeeklyLadder(now);
    const state = getLadderState(now);
    expect(state.points).toBe(150);
  });
});

// ── getLeagueInfo ────────────────────────────────────────────────────────────

describe("getLeagueInfo", () => {
  it("returns correct info for each league", () => {
    const leagues: League[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "legend"];

    for (const league of leagues) {
      const info = getLeagueInfo(league);
      expect(info.league).toBe(league);
      expect(info.label.ko).toBeTruthy();
      expect(info.label.en).toBeTruthy();
      expect(info.color).toMatch(/^#/);
      expect(info.icon).toBeTruthy();
      expect(typeof info.minPoints).toBe("number");
    }
  });

  it("has increasing minPoints across leagues", () => {
    const leagues: League[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "legend"];
    let prev = -1;
    for (const league of leagues) {
      const info = getLeagueInfo(league);
      expect(info.minPoints).toBeGreaterThan(prev);
      prev = info.minPoints;
    }
  });

  it("LEAGUE_CONFIG contains all seven leagues", () => {
    expect(Object.keys(LEAGUE_CONFIG)).toHaveLength(7);
  });
});
