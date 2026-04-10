import { describe, it, expect } from "vitest";
import {
  calculateHotScore,
  sortByHot,
  sortByNew,
  sortByTop,
  type ScoredPost,
} from "./vote-sort";

/* ── helpers ── */

function makePost(
  id: string,
  upvotes: number,
  hoursAgo: number,
  now: Date = new Date("2026-04-10T12:00:00Z"),
): ScoredPost {
  const createdAt = new Date(now.getTime() - hoursAgo * 3_600_000);
  return { id, upvotes, createdAt };
}

const NOW = new Date("2026-04-10T12:00:00Z");

/* ── calculateHotScore ── */

describe("calculateHotScore", () => {
  it("returns the upvote count for a brand-new post (age = 0)", () => {
    const score = calculateHotScore(10, NOW, NOW);
    // log2(1+0) = 0, so penalty = 0
    expect(score).toBe(10);
  });

  it("applies a logarithmic penalty based on age", () => {
    // 1 hour old: penalty = 1.8 * log2(2) = 1.8
    const score = calculateHotScore(10, new Date(NOW.getTime() - 3_600_000), NOW);
    expect(score).toBeCloseTo(10 - 1.8, 5);
  });

  it("older posts get a larger penalty", () => {
    const score1h = calculateHotScore(10, new Date(NOW.getTime() - 1 * 3_600_000), NOW);
    const score24h = calculateHotScore(10, new Date(NOW.getTime() - 24 * 3_600_000), NOW);
    expect(score1h).toBeGreaterThan(score24h);
  });

  it("posts with more upvotes can still outrank newer posts", () => {
    const oldPopular = calculateHotScore(50, new Date(NOW.getTime() - 12 * 3_600_000), NOW);
    const newUnpopular = calculateHotScore(2, NOW, NOW);
    expect(oldPopular).toBeGreaterThan(newUnpopular);
  });

  it("returns a negative score for a very old post with no upvotes", () => {
    // 168 hours (7 days), 0 upvotes
    const score = calculateHotScore(0, new Date(NOW.getTime() - 168 * 3_600_000), NOW);
    expect(score).toBeLessThan(0);
  });

  it("never goes below zero age (future dates are clamped)", () => {
    const futurePost = new Date(NOW.getTime() + 3_600_000);
    const score = calculateHotScore(5, futurePost, NOW);
    // age is clamped to 0 via Math.max
    expect(score).toBe(5);
  });

  it("accepts a custom gravity parameter", () => {
    const defaultGravity = calculateHotScore(
      10,
      new Date(NOW.getTime() - 3_600_000),
      NOW,
    );
    const higherGravity = calculateHotScore(
      10,
      new Date(NOW.getTime() - 3_600_000),
      NOW,
      3.0,
    );
    expect(higherGravity).toBeLessThan(defaultGravity);
  });
});

/* ── sortByHot ── */

describe("sortByHot", () => {
  it("sorts posts with highest hot score first", () => {
    const posts = [
      makePost("old-popular", 10, 48, NOW), // 10 - 1.8*log2(49) ≈ -0.1
      makePost("new-mid", 15, 1, NOW),      // 15 - 1.8*log2(2) ≈ 13.2
      makePost("brand-new", 5, 0, NOW),     // 5 - 0 = 5
    ];
    const sorted = sortByHot(posts, NOW);
    expect(sorted[0].id).toBe("new-mid");
    expect(sorted[1].id).toBe("brand-new");
    expect(sorted[2].id).toBe("old-popular");
  });

  it("populates hotScore on each returned post", () => {
    const posts = [makePost("a", 10, 2, NOW)];
    const sorted = sortByHot(posts, NOW);
    expect(sorted[0].hotScore).toBeDefined();
    expect(typeof sorted[0].hotScore).toBe("number");
  });

  it("returns empty array for empty input", () => {
    expect(sortByHot([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const posts = [makePost("a", 10, 2, NOW), makePost("b", 20, 0, NOW)];
    const original = [...posts];
    sortByHot(posts, NOW);
    expect(posts.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });
});

/* ── sortByNew ── */

describe("sortByNew", () => {
  it("sorts newest first", () => {
    const posts = [
      makePost("old", 100, 48, NOW),
      makePost("mid", 5, 12, NOW),
      makePost("new", 1, 0, NOW),
    ];
    const sorted = sortByNew(posts);
    expect(sorted.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns empty array for empty input", () => {
    expect(sortByNew([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const posts = [makePost("a", 1, 10, NOW), makePost("b", 1, 0, NOW)];
    const original = [...posts];
    sortByNew(posts);
    expect(posts.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });
});

/* ── sortByTop ── */

describe("sortByTop", () => {
  it("filters to posts within the day period", () => {
    const posts = [
      makePost("today", 10, 6, NOW),
      makePost("yesterday", 50, 30, NOW),
      makePost("last-week", 100, 200, NOW),
    ];
    const sorted = sortByTop(posts, "day", NOW);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe("today");
  });

  it("filters to posts within the week period", () => {
    const posts = [
      makePost("today", 10, 6, NOW),
      makePost("3-days", 50, 72, NOW),
      makePost("2-weeks", 100, 336, NOW),
    ];
    const sorted = sortByTop(posts, "week", NOW);
    expect(sorted).toHaveLength(2);
    // Highest upvotes first
    expect(sorted[0].id).toBe("3-days");
    expect(sorted[1].id).toBe("today");
  });

  it("filters to posts within the month period", () => {
    const posts = [
      makePost("today", 5, 1, NOW),
      makePost("2-weeks", 30, 336, NOW),
      makePost("2-months", 100, 1440, NOW),
    ];
    const sorted = sortByTop(posts, "month", NOW);
    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe("2-weeks");
    expect(sorted[1].id).toBe("today");
  });

  it("sorts by upvotes descending within the period", () => {
    const posts = [
      makePost("low", 3, 2, NOW),
      makePost("high", 50, 5, NOW),
      makePost("mid", 20, 3, NOW),
    ];
    const sorted = sortByTop(posts, "day", NOW);
    expect(sorted.map((p) => p.id)).toEqual(["high", "mid", "low"]);
  });

  it("returns empty array when no posts fall within the period", () => {
    const posts = [makePost("ancient", 100, 1000, NOW)];
    expect(sortByTop(posts, "day", NOW)).toEqual([]);
    expect(sortByTop(posts, "week", NOW)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(sortByTop([], "day")).toEqual([]);
    expect(sortByTop([], "week")).toEqual([]);
    expect(sortByTop([], "month")).toEqual([]);
  });
});
