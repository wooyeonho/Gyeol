import { describe, expect, it } from "vitest";
import {
  dailyPromptWindowStart,
  FEED_RECIPES,
  featuredReactionOfDay,
  isDailyPromptActive,
  rankFeed,
  scoreFeedItem,
  SOCIAL_PRINCIPLES,
  TAPBACK_REACTIONS,
} from "./world-class-social";

describe("SOCIAL_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(SOCIAL_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
  it("every id is unique and non-empty", () => {
    const ids = SOCIAL_PRINCIPLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});

describe("FEED_RECIPES", () => {
  it("chronological weighs only recency", () => {
    const w = FEED_RECIPES.chronological.weights;
    expect(w.recency).toBe(1);
    expect(w.affinity + w.novelty + w.engagement).toBe(0);
  });
  it("close-friends maxes affinity", () => {
    expect(FEED_RECIPES["close-friends"].weights.affinity).toBe(1);
  });
});

describe("scoreFeedItem", () => {
  it("newer items out-rank older with same signals", () => {
    const a = { id: "a", ageMinutes: 10, affinity: 0.5, novelty: 0.5, engagement: 0.5 };
    const b = { id: "b", ageMinutes: 10_000, affinity: 0.5, novelty: 0.5, engagement: 0.5 };
    const recipe = FEED_RECIPES["for-you"];
    expect(scoreFeedItem(a, recipe)).toBeGreaterThan(scoreFeedItem(b, recipe));
  });
});

describe("rankFeed", () => {
  const items = [
    { id: "a", ageMinutes: 60, affinity: 0.2, novelty: 0.9, engagement: 0.3 },
    { id: "b", ageMinutes: 60, affinity: 0.9, novelty: 0.2, engagement: 0.3 },
    { id: "c", ageMinutes: 60, affinity: 0.2, novelty: 0.2, engagement: 0.9 },
  ];
  it("close-friends puts high-affinity first", () => {
    expect(rankFeed(items, "close-friends")[0].id).toBe("b");
  });
  it("discover puts high-novelty first", () => {
    expect(rankFeed(items, "discover")[0].id).toBe("a");
  });
});

describe("daily prompt window", () => {
  it("is deterministic given same date+seed", () => {
    const a = dailyPromptWindowStart("2026-04-11", "user-7");
    const b = dailyPromptWindowStart("2026-04-11", "user-7");
    expect(a).toBe(b);
  });
  it("varies per seed", () => {
    const a = dailyPromptWindowStart("2026-04-11", "u1");
    const b = dailyPromptWindowStart("2026-04-11", "u2");
    expect(a).not.toBe(b);
  });
  it("isDailyPromptActive respects window", () => {
    const start = 600; // 10:00
    const inside = new Date(2026, 3, 11, 10, 1);
    const outside = new Date(2026, 3, 11, 9, 59);
    expect(isDailyPromptActive(inside, start, 2)).toBe(true);
    expect(isDailyPromptActive(outside, start, 2)).toBe(false);
  });
});

describe("featured reaction", () => {
  it("rotates through all tapback reactions across the year", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 365; d++) seen.add(featuredReactionOfDay(d).id);
    expect(seen.size).toBe(TAPBACK_REACTIONS.length);
  });
});
