import { describe, expect, it } from "vitest";
import {
  AXES,
  INSPIRATIONS,
  inspirationOfTheDay,
  inspirationsByAxis,
  inspirationsBySource,
  TREND_SOURCES,
} from "./catalog";

describe("AXES", () => {
  it("covers exactly 20 axes", () => {
    expect(AXES.length).toBe(20);
  });
  it("every axis has a unique id", () => {
    const ids = AXES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every axis points at an existing-looking playbook path", () => {
    for (const a of AXES) {
      expect(a.playbook).toMatch(/^lib\/[^/]+\/world-class-[a-z-]+\.ts$/);
    }
  });
});

describe("INSPIRATIONS", () => {
  it("covers 50+ apps across all axes", () => {
    expect(INSPIRATIONS.length).toBeGreaterThanOrEqual(50);
  });
  it("every axis has at least one inspiration", () => {
    for (const axis of AXES) {
      const count = inspirationsByAxis(axis.id).length;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
  it("every inspiration belongs to a known axis", () => {
    const axisIds = new Set(AXES.map((a) => a.id));
    for (const i of INSPIRATIONS) expect(axisIds.has(i.axis)).toBe(true);
  });
});

describe("inspirationsBySource", () => {
  it("returns only matching sources", () => {
    const twitter = inspirationsBySource("twitter-x");
    for (const i of twitter) expect(i.sources.includes("twitter-x")).toBe(true);
  });
});

describe("inspirationOfTheDay", () => {
  it("is deterministic for same day key", () => {
    expect(inspirationOfTheDay("2026-04-11").id).toBe(inspirationOfTheDay("2026-04-11").id);
  });
  it("differs across days", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 30; d++) seen.add(inspirationOfTheDay(`2026-04-${d}`).id);
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("TREND_SOURCES", () => {
  it("covers 7+ trend sources", () => {
    expect(TREND_SOURCES.length).toBeGreaterThanOrEqual(7);
  });
});
