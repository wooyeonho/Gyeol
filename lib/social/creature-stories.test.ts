import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  publishStory,
  getActiveStories,
  isStoryExpired,
  getStoryFeed,
  STORY_DURATION_MS,
} from "./creature-stories";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

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

describe("creature-stories", () => {
  beforeEach(() => {
    store.clear();
  });

  // ── publishStory ───────────────────────────────────────────────────────

  it("publishes a story with correct fields", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const story = publishStory("Mochi", "Had a great day!", "happy", now);

    expect(story.creatureName).toBe("Mochi");
    expect(story.content).toBe("Had a great day!");
    expect(story.mood).toBe("happy");
    expect(story.id).toBeTruthy();
    expect(story.createdAt).toBe(now.toISOString());
  });

  it("sets expiresAt to 24 hours after creation", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const story = publishStory("Mochi", "Hello world", "neutral", now);

    const expected = new Date(now.getTime() + STORY_DURATION_MS).toISOString();
    expect(story.expiresAt).toBe(expected);
  });

  // ── isStoryExpired ─────────────────────────────────────────────────────

  it("returns false for a fresh story", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const story = publishStory("Mochi", "Fresh story", "excited", now);

    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    expect(isStoryExpired(story, oneHourLater)).toBe(false);
  });

  it("returns true after 24 hours", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const story = publishStory("Mochi", "Old story", "calm", now);

    const dayLater = new Date(now.getTime() + STORY_DURATION_MS);
    expect(isStoryExpired(story, dayLater)).toBe(true);
  });

  it("returns true well past expiry", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const story = publishStory("Mochi", "Ancient story", "sad", now);

    const weekLater = new Date(now.getTime() + 7 * STORY_DURATION_MS);
    expect(isStoryExpired(story, weekLater)).toBe(true);
  });

  // ── getActiveStories ───────────────────────────────────────────────────

  it("returns only non-expired stories", () => {
    const t0 = new Date("2026-04-10T00:00:00Z");
    const t1 = new Date("2026-04-10T06:00:00Z");
    const t2 = new Date("2026-04-10T12:00:00Z");

    publishStory("A", "Old story", "tired", t0);
    publishStory("B", "Medium story", "neutral", t1);
    publishStory("C", "New story", "happy", t2);

    // Check at 25 hours after t0 — first story expired
    const checkTime = new Date(t0.getTime() + 25 * 60 * 60 * 1000);
    const active = getActiveStories(checkTime);

    expect(active.length).toBe(2);
    expect(active.map((s) => s.creatureName)).toContain("B");
    expect(active.map((s) => s.creatureName)).toContain("C");
    expect(active.map((s) => s.creatureName)).not.toContain("A");
  });

  it("returns stories sorted newest first", () => {
    const t0 = new Date("2026-04-10T08:00:00Z");
    const t1 = new Date("2026-04-10T10:00:00Z");
    const t2 = new Date("2026-04-10T12:00:00Z");

    publishStory("First", "1", "calm", t0);
    publishStory("Second", "2", "neutral", t1);
    publishStory("Third", "3", "excited", t2);

    const active = getActiveStories(t2);
    expect(active[0].creatureName).toBe("Third");
    expect(active[1].creatureName).toBe("Second");
    expect(active[2].creatureName).toBe("First");
  });

  it("returns empty array when all stories expired", () => {
    const now = new Date("2026-04-10T00:00:00Z");
    publishStory("X", "Gone", "sad", now);

    const farFuture = new Date(now.getTime() + 2 * STORY_DURATION_MS);
    expect(getActiveStories(farFuture)).toEqual([]);
  });

  // ── getStoryFeed ───────────────────────────────────────────────────────

  it("groups stories by creature name", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    publishStory("Mochi", "Story 1", "happy", now);
    publishStory("Mochi", "Story 2", "excited", now);
    publishStory("Luna", "Luna's story", "calm", now);

    const feed = getStoryFeed(now);
    expect(Object.keys(feed)).toHaveLength(2);
    expect(feed["Mochi"]).toHaveLength(2);
    expect(feed["Luna"]).toHaveLength(1);
  });

  it("excludes expired stories from feed", () => {
    const old = new Date("2026-04-09T00:00:00Z");
    const recent = new Date("2026-04-10T12:00:00Z");

    publishStory("Old", "expired", "tired", old);
    publishStory("New", "fresh", "happy", recent);

    const feed = getStoryFeed(recent);
    expect(feed["Old"]).toBeUndefined();
    expect(feed["New"]).toHaveLength(1);
  });

  it("returns empty object when no stories exist", () => {
    const feed = getStoryFeed();
    expect(feed).toEqual({});
  });
});
