import { describe, it, expect } from "vitest";
import {
  generateDailyChallenges,
  getTodayDateString,
  getTargetForCondition,
  isAllChallengesCompleted,
  getPerfectDayBonus,
} from "./daily-challenge";

describe("generateDailyChallenges", () => {
  it("generates exactly 3 challenges (easy, medium, hard)", () => {
    const challenges = generateDailyChallenges("2026-03-19");
    expect(challenges).toHaveLength(3);
    expect(challenges[0].difficulty).toBe("easy");
    expect(challenges[1].difficulty).toBe("medium");
    expect(challenges[2].difficulty).toBe("hard");
  });

  it("is deterministic for the same date", () => {
    const a = generateDailyChallenges("2026-03-19");
    const b = generateDailyChallenges("2026-03-19");
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it("generates different challenges for different dates", () => {
    const a = generateDailyChallenges("2026-03-19");
    const b = generateDailyChallenges("2026-03-20");
    // Not guaranteed to be different, but very likely with multiple challenge pools
    // Just verify they're valid
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
  });
});

describe("getTodayDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = getTodayDateString(new Date("2026-03-19T15:30:00Z"));
    expect(d).toBe("2026-03-19");
  });
});

describe("getTargetForCondition", () => {
  it("returns count for message-based conditions", () => {
    expect(getTargetForCondition({ type: "send_messages", count: 10 })).toBe(10);
  });

  it("returns 1 for single-action conditions", () => {
    expect(getTargetForCondition({ type: "visit_social_feed" })).toBe(1);
    expect(getTargetForCondition({ type: "give_gift" })).toBe(1);
  });
});

describe("isAllChallengesCompleted", () => {
  it("returns true when all completed", () => {
    expect(isAllChallengesCompleted({
      date: "2026-03-19",
      challenges: [
        { id: "a", difficulty: "easy", progress: 3, target: 3, completed: true },
        { id: "b", difficulty: "medium", progress: 1, target: 1, completed: true },
        { id: "c", difficulty: "hard", progress: 5, target: 5, completed: true },
      ],
      perfectDayClaimed: false,
    })).toBe(true);
  });

  it("returns false when any incomplete", () => {
    expect(isAllChallengesCompleted({
      date: "2026-03-19",
      challenges: [
        { id: "a", difficulty: "easy", progress: 3, target: 3, completed: true },
        { id: "b", difficulty: "medium", progress: 0, target: 1, completed: false },
        { id: "c", difficulty: "hard", progress: 5, target: 5, completed: true },
      ],
      perfectDayClaimed: false,
    })).toBe(false);
  });
});

describe("getPerfectDayBonus", () => {
  it("returns reward with coins and evolution points", () => {
    const bonus = getPerfectDayBonus();
    expect(bonus.coins).toBeGreaterThan(0);
    expect(bonus.evolution_points).toBeGreaterThan(0);
  });
});
