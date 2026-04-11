import { describe, expect, it } from "vitest";
import {
  applyPull,
  availableRewards,
  levelFromXp,
  LIVEOPS_PRINCIPLES,
  pityDropChance,
  rankAfterInactivity,
  secondsUntilDailyReset,
} from "./world-class-liveops";

describe("LIVEOPS_PRINCIPLES", () => {
  it("has 10+ principles", () => {
    expect(LIVEOPS_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("pity drop chance", () => {
  const state = { pullsSinceGuaranteed: 0, threshold: 90, softStart: 75 };
  it("flat before soft start", () => {
    expect(pityDropChance(state, 0.01)).toBe(0.01);
  });
  it("ramps up past soft start", () => {
    const mid = pityDropChance({ ...state, pullsSinceGuaranteed: 82 }, 0.01);
    expect(mid).toBeGreaterThan(0.01);
    expect(mid).toBeLessThan(1);
  });
  it("guaranteed at threshold", () => {
    expect(pityDropChance({ ...state, pullsSinceGuaranteed: 90 }, 0.01)).toBe(1);
  });
});

describe("applyPull", () => {
  it("resets counter on hit", () => {
    const s = applyPull({ pullsSinceGuaranteed: 40, threshold: 90, softStart: 75 }, true);
    expect(s.pullsSinceGuaranteed).toBe(0);
  });
  it("increments on miss", () => {
    const s = applyPull({ pullsSinceGuaranteed: 40, threshold: 90, softStart: 75 }, false);
    expect(s.pullsSinceGuaranteed).toBe(41);
  });
});

describe("secondsUntilDailyReset", () => {
  it("returns positive value", () => {
    const now = new Date(Date.UTC(2026, 3, 11, 12, 0, 0));
    expect(secondsUntilDailyReset(now, 4, 9)).toBeGreaterThan(0);
  });
});

describe("season pass", () => {
  it("level floor computation", () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(999)).toBe(0);
    expect(levelFromXp(1000)).toBe(1);
    expect(levelFromXp(150_000, 1000, 100)).toBe(100);
  });
  it("free track rewards are available without premium", () => {
    const rewards = [
      { level: 1, track: "free" as const, label: "free-1" },
      { level: 1, track: "premium" as const, label: "pre-1" },
    ];
    const free = availableRewards(rewards, 5, false);
    expect(free.map((r) => r.label)).toEqual(["free-1"]);
  });
  it("premium unlocks both tracks", () => {
    const rewards = [
      { level: 1, track: "free" as const, label: "f" },
      { level: 1, track: "premium" as const, label: "p" },
    ];
    expect(availableRewards(rewards, 5, true)).toHaveLength(2);
  });
});

describe("rankAfterInactivity", () => {
  it("grace period protects rank", () => {
    expect(rankAfterInactivity(1000, 10, 14, 25)).toBe(1000);
  });
  it("decays past grace period", () => {
    expect(rankAfterInactivity(1000, 20, 14, 25)).toBe(1000 - 6 * 25);
  });
  it("floors at zero", () => {
    expect(rankAfterInactivity(10, 365, 14, 25)).toBe(0);
  });
});
