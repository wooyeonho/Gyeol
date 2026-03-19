import { describe, it, expect } from "vitest";
import {
  computeTier,
  computeFriendshipProgress,
  getNextMilestone,
  isSharedStreakActive,
  getDuoStreakMultiplier,
  getInteractionScore,
} from "./friendship";

describe("computeTier", () => {
  it("returns acquaintance for 0 score", () => {
    expect(computeTier(0)).toBe("acquaintance");
  });

  it("returns friend for 10+ score", () => {
    expect(computeTier(10)).toBe("friend");
  });

  it("returns soulmate for 150+ score", () => {
    expect(computeTier(150)).toBe("soulmate");
    expect(computeTier(999)).toBe("soulmate");
  });
});

describe("computeFriendshipProgress", () => {
  it("shows progress toward next tier", () => {
    const p = computeFriendshipProgress(5);
    expect(p.currentTier).toBe("acquaintance");
    expect(p.nextTier).toBe("friend");
    expect(p.progress).toBe(50);
    expect(p.scoreToNext).toBe(5);
  });

  it("shows 100% at max tier", () => {
    const p = computeFriendshipProgress(200);
    expect(p.currentTier).toBe("soulmate");
    expect(p.nextTier).toBeNull();
    expect(p.progress).toBe(100);
  });
});

describe("getNextMilestone", () => {
  it("returns next milestone", () => {
    const next = getNextMilestone("friend");
    expect(next?.tier).toBe("close_friend");
  });

  it("returns null for max tier", () => {
    expect(getNextMilestone("soulmate")).toBeNull();
  });
});

describe("isSharedStreakActive", () => {
  it("returns true when both interacted recently", () => {
    const now = new Date("2026-03-19T12:00:00Z");
    expect(isSharedStreakActive(
      "2026-03-19T00:00:00Z",
      "2026-03-18T20:00:00Z",
      now,
    )).toBe(true);
  });

  it("returns false when one hasn't interacted", () => {
    const now = new Date("2026-03-19T12:00:00Z");
    expect(isSharedStreakActive(
      "2026-03-19T00:00:00Z",
      null,
      now,
    )).toBe(false);
  });

  it("returns false when interaction too old", () => {
    const now = new Date("2026-03-19T12:00:00Z");
    expect(isSharedStreakActive(
      "2026-03-16T00:00:00Z", // 3 days ago > 48h
      "2026-03-19T00:00:00Z",
      now,
    )).toBe(false);
  });
});

describe("getDuoStreakMultiplier", () => {
  it("returns 1 for no streak", () => {
    expect(getDuoStreakMultiplier(0)).toBe(1);
  });

  it("returns 1.5 for 30+ days", () => {
    expect(getDuoStreakMultiplier(30)).toBe(1.5);
  });
});

describe("getInteractionScore", () => {
  it("returns correct scores", () => {
    expect(getInteractionScore("follow")).toBe(3);
    expect(getInteractionScore("gift")).toBe(5);
    expect(getInteractionScore("unknown")).toBe(0);
  });
});
