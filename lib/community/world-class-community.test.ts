import { describe, expect, it } from "vitest";
import {
  COMMUNITY_PRINCIPLES,
  hnScore,
  rankPosts,
  REPUTATION_TIERS,
  reputationTier,
} from "./world-class-community";

describe("COMMUNITY_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(COMMUNITY_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("hnScore", () => {
  it("newer posts rank higher than older with same upvotes", () => {
    expect(hnScore(100, 1)).toBeGreaterThan(hnScore(100, 50));
  });
  it("more upvotes rank higher at same age", () => {
    expect(hnScore(200, 5)).toBeGreaterThan(hnScore(100, 5));
  });
});

describe("rankPosts", () => {
  it("orders by hn score desc", () => {
    const posts = [
      { id: "old-popular", upvotes: 500, ageHours: 48 },
      { id: "fresh-hot", upvotes: 80, ageHours: 2 },
      { id: "stale", upvotes: 10, ageHours: 100 },
    ];
    const ranked = rankPosts(posts);
    expect(ranked[0].id).toBe("fresh-hot");
    expect(ranked[ranked.length - 1].id).toBe("stale");
  });
});

describe("reputationTier", () => {
  it("returns the highest tier satisfying the reputation", () => {
    expect(reputationTier(0).label).toBe(REPUTATION_TIERS[0].label);
    expect(reputationTier(14).label).toBe(REPUTATION_TIERS[0].label);
    expect(reputationTier(15).label).toBe(REPUTATION_TIERS[1].label);
    expect(reputationTier(10000).label).toBe(REPUTATION_TIERS[4].label);
  });
});
