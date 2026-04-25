import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getPvPState,
  recordMatch,
  getWinRate,
  getRankFromRating,
  getRankInfo,
  resetSeason,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PVP_RANKS,
} from "./pvp-ranking";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  },
});
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

describe("pvp-ranking", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts with default state at bronze", () => {
    const state = getPvPState();
    expect(state.rating).toBe(1000);
    expect(state.rank).toBe("bronze");
    expect(state.wins).toBe(0);
  });

  it("recordMatch updates rating on win", () => {
    const match = recordMatch("Opponent", 1000, 5, "win");
    expect(match.ratingChange).toBeGreaterThan(0);
    const state = getPvPState();
    expect(state.rating).toBeGreaterThan(1000);
    expect(state.wins).toBe(1);
    expect(state.streak).toBe(1);
  });

  it("recordMatch decreases rating on loss", () => {
    const match = recordMatch("Opponent", 1000, 5, "loss");
    expect(match.ratingChange).toBeLessThan(0);
    const state = getPvPState();
    expect(state.rating).toBeLessThan(1000);
    expect(state.losses).toBe(1);
    expect(state.streak).toBe(0);
  });

  it("recordMatch handles draw", () => {
    const match = recordMatch("Opponent", 1000, 5, "draw");
    const state = getPvPState();
    expect(state.draws).toBe(1);
    expect(Math.abs(match.ratingChange)).toBeLessThanOrEqual(16);
  });

  it("streak increments on consecutive wins", () => {
    recordMatch("A", 1000, 3, "win");
    recordMatch("B", 1000, 3, "win");
    recordMatch("C", 1000, 3, "win");
    const state = getPvPState();
    expect(state.streak).toBe(3);
    expect(state.bestStreak).toBe(3);
  });

  it("streak resets on loss", () => {
    recordMatch("A", 1000, 3, "win");
    recordMatch("B", 1000, 3, "win");
    recordMatch("C", 1000, 3, "loss");
    const state = getPvPState();
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(2);
  });

  it("getRankFromRating maps correctly", () => {
    expect(getRankFromRating(0)).toBe("unranked");
    expect(getRankFromRating(800)).toBe("bronze");
    expect(getRankFromRating(1000)).toBe("silver");
    expect(getRankFromRating(1200)).toBe("gold");
    expect(getRankFromRating(1600)).toBe("diamond");
    expect(getRankFromRating(2000)).toBe("grandmaster");
  });

  it("getWinRate calculates correctly", () => {
    recordMatch("A", 1000, 3, "win");
    recordMatch("B", 1000, 3, "win");
    recordMatch("C", 1000, 3, "loss");
    const state = getPvPState();
    expect(getWinRate(state)).toBe(67);
  });

  it("getWinRate returns 0 with no matches", () => {
    expect(getWinRate(getPvPState())).toBe(0);
  });

  it("getRankInfo returns valid info", () => {
    const info = getRankInfo("diamond");
    expect(info.color).toBeTruthy();
    expect(info.label.ko).toBeTruthy();
    expect(info.icon).toBeTruthy();
  });

  it("resetSeason soft-resets rating", () => {
    recordMatch("A", 1000, 3, "win");
    recordMatch("B", 1000, 3, "win");
    recordMatch("C", 1000, 3, "win");
    recordMatch("D", 1000, 3, "win");
    recordMatch("E", 1000, 3, "win");
    const before = getPvPState().rating;
    expect(before).toBeGreaterThan(1000);
    resetSeason();
    const after = getPvPState();
    // Soft reset pulls toward 1000
    expect(after.rating).toBeLessThan(before);
    expect(after.wins).toBe(0);
    expect(after.matchHistory).toHaveLength(0);
  });

  it("match history caps at 50", () => {
    for (let i = 0; i < 55; i++) {
      recordMatch(`Opp${i}`, 1000, 1, "win");
    }
    const state = getPvPState();
    expect(state.matchHistory.length).toBeLessThanOrEqual(50);
  });

  it("ELO gives more points for beating higher-rated opponents", () => {
    const m1 = recordMatch("Weak", 800, 1, "win");
    store.clear(); // Reset
    const m2 = recordMatch("Strong", 1500, 10, "win");
    expect(m2.ratingChange).toBeGreaterThan(m1.ratingChange);
  });
});
