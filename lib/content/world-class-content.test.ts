import { describe, expect, it } from "vitest";
import {
  CONTENT_PRINCIPLES,
  continueWatching,
  dailyMix,
  DEFAULT_SHELVES,
  orderedShelves,
  shouldResume,
} from "./world-class-content";

describe("CONTENT_PRINCIPLES", () => {
  it("covers 10+ principles from 11+ apps", () => {
    expect(CONTENT_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("shouldResume", () => {
  const base = { id: "x", startedAt: 0, updatedAt: 0 };
  it("skips very short plays", () => {
    expect(shouldResume({ ...base, positionSec: 5, durationSec: 600 })).toBe(false);
  });
  it("skips near-completed plays", () => {
    expect(shouldResume({ ...base, positionSec: 580, durationSec: 600 })).toBe(false);
  });
  it("resumes middle plays", () => {
    expect(shouldResume({ ...base, positionSec: 120, durationSec: 600 })).toBe(true);
  });
});

describe("continueWatching", () => {
  it("sorts by updatedAt desc and filters out near-complete", () => {
    const sessions = [
      { id: "a", startedAt: 0, positionSec: 100, durationSec: 500, updatedAt: 10 },
      { id: "b", startedAt: 0, positionSec: 100, durationSec: 500, updatedAt: 20 },
      { id: "c", startedAt: 0, positionSec: 495, durationSec: 500, updatedAt: 30 },
    ];
    const result = continueWatching(sessions);
    expect(result.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("dailyMix", () => {
  const seeds = Array.from({ length: 40 }, (_, i) => ({
    id: `s${i}`,
    tags: ["calm"],
    plays: 40 - i,
  }));
  it("is deterministic for same day key", () => {
    const a = dailyMix(seeds, "2026-04-11", 20);
    const b = dailyMix(seeds, "2026-04-11", 20);
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
  });
  it("differs between days", () => {
    const a = dailyMix(seeds, "2026-04-11", 20).map((s) => s.id);
    const b = dailyMix(seeds, "2026-04-12", 20).map((s) => s.id);
    expect(a).not.toEqual(b);
  });
  it("respects the requested size", () => {
    expect(dailyMix(seeds, "2026-04-11", 10)).toHaveLength(10);
  });
});

describe("orderedShelves", () => {
  it("promotes resume shelf when user has resume content", () => {
    const with_ = orderedShelves({ catalogSize: 1000, hasResume: true });
    expect(with_[0].kind).toBe("resume");
  });
  it("demotes resume shelf when user has none", () => {
    const without = orderedShelves({ catalogSize: 1000, hasResume: false });
    expect(without[0].kind).not.toBe("resume");
  });
  it("always returns all default shelves", () => {
    const ordered = orderedShelves({ catalogSize: 1000, hasResume: false });
    expect(ordered).toHaveLength(DEFAULT_SHELVES.length);
  });
});
