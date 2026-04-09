import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkPerfectDay,
  isConsecutiveDay,
  recordPerfectDay,
  getPerfectDayStreak,
  getEarnedPerfectDayMilestones,
  todayDateString,
} from "./perfect-day";

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  });
});

describe("checkPerfectDay", () => {
  it("returns true when all challenges completed", () => {
    expect(checkPerfectDay(3, 3)).toBe(true);
  });

  it("returns true when completed exceeds total", () => {
    expect(checkPerfectDay(5, 3)).toBe(true);
  });

  it("returns false when not all completed", () => {
    expect(checkPerfectDay(2, 3)).toBe(false);
  });

  it("returns false when total is 0", () => {
    expect(checkPerfectDay(0, 0)).toBe(false);
  });
});

describe("isConsecutiveDay", () => {
  it("returns true for consecutive days", () => {
    expect(isConsecutiveDay("2026-04-08", "2026-04-09")).toBe(true);
  });

  it("returns true across month boundary", () => {
    expect(isConsecutiveDay("2026-03-31", "2026-04-01")).toBe(true);
  });

  it("returns false for same day", () => {
    expect(isConsecutiveDay("2026-04-09", "2026-04-09")).toBe(false);
  });

  it("returns false for non-consecutive days", () => {
    expect(isConsecutiveDay("2026-04-07", "2026-04-09")).toBe(false);
  });

  it("returns false for reversed order", () => {
    expect(isConsecutiveDay("2026-04-09", "2026-04-08")).toBe(false);
  });
});

describe("todayDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = todayDateString(new Date("2026-04-09T15:30:00Z"));
    expect(d).toBe("2026-04-09");
  });
});

describe("recordPerfectDay", () => {
  it("records a new perfect day", () => {
    recordPerfectDay(new Date("2026-04-09T12:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T18:00:00Z"));
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
    expect(streak.total).toBe(1);
  });

  it("is idempotent for the same day", () => {
    recordPerfectDay(new Date("2026-04-09T10:00:00Z"));
    recordPerfectDay(new Date("2026-04-09T15:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T18:00:00Z"));
    expect(streak.total).toBe(1);
    expect(streak.current).toBe(1);
  });

  it("extends streak for consecutive days", () => {
    recordPerfectDay(new Date("2026-04-07T12:00:00Z"));
    recordPerfectDay(new Date("2026-04-08T12:00:00Z"));
    recordPerfectDay(new Date("2026-04-09T12:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T18:00:00Z"));
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
    expect(streak.total).toBe(3);
  });

  it("resets current streak on gap but preserves longest", () => {
    recordPerfectDay(new Date("2026-04-05T12:00:00Z"));
    recordPerfectDay(new Date("2026-04-06T12:00:00Z"));
    recordPerfectDay(new Date("2026-04-07T12:00:00Z"));
    // Gap on April 8
    recordPerfectDay(new Date("2026-04-09T12:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T18:00:00Z"));
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(3);
    expect(streak.total).toBe(4);
  });
});

describe("getPerfectDayStreak", () => {
  it("returns zero for empty state", () => {
    const streak = getPerfectDayStreak(new Date("2026-04-09T12:00:00Z"));
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(0);
    expect(streak.total).toBe(0);
  });

  it("shows active streak when last day was yesterday", () => {
    recordPerfectDay(new Date("2026-04-08T12:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T10:00:00Z"));
    expect(streak.current).toBe(1);
  });

  it("resets current streak when last day was two days ago", () => {
    recordPerfectDay(new Date("2026-04-07T12:00:00Z"));
    const streak = getPerfectDayStreak(new Date("2026-04-09T10:00:00Z"));
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(1);
    expect(streak.total).toBe(1);
  });
});

describe("getEarnedPerfectDayMilestones", () => {
  it("returns empty for streak of 0", () => {
    expect(getEarnedPerfectDayMilestones(0)).toEqual([]);
  });

  it("returns [3] for streak of 3", () => {
    expect(getEarnedPerfectDayMilestones(3)).toEqual([3]);
  });

  it("returns [3, 7] for streak of 7", () => {
    expect(getEarnedPerfectDayMilestones(7)).toEqual([3, 7]);
  });

  it("returns [3, 7, 14] for streak of 14", () => {
    expect(getEarnedPerfectDayMilestones(14)).toEqual([3, 7, 14]);
  });

  it("returns all milestones for streak of 30+", () => {
    expect(getEarnedPerfectDayMilestones(30)).toEqual([3, 7, 14, 30]);
    expect(getEarnedPerfectDayMilestones(100)).toEqual([3, 7, 14, 30]);
  });

  it("returns correct milestones for in-between values", () => {
    expect(getEarnedPerfectDayMilestones(5)).toEqual([3]);
    expect(getEarnedPerfectDayMilestones(10)).toEqual([3, 7]);
    expect(getEarnedPerfectDayMilestones(20)).toEqual([3, 7, 14]);
  });
});
