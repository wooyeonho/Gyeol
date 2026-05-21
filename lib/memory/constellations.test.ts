import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/embedding", () => ({
  // Theme prompt -> fake embedding (length doesn't matter for these tests since
  // we stub matchByEmbedding too — just needs to be a non-empty array so the
  // cache stores it).
  generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

import { buildConstellations, CONSTELLATION_THEMES } from "./constellations";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildConstellations", () => {
  it("returns empty list when there are no stars", async () => {
    const result = await buildConstellations([], async () => ["a", "b"]);
    expect(result).toEqual([]);
  });

  it("filters out match IDs that aren't in the star set", async () => {
    const stars = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];
    const result = await buildConstellations(
      stars,
      async () => ["off_canvas_1", "s1", "off_canvas_2", "s2"],
    );
    for (const c of result) {
      for (const id of c.starIds) {
        expect(["s1", "s2", "s3"]).toContain(id);
      }
    }
  });

  it("skips themes with fewer than 2 surviving matches", async () => {
    const stars = [{ id: "s1" }];
    const result = await buildConstellations(stars, async () => ["s1"]);
    expect(result).toEqual([]);
  });

  it("uses Korean theme names when locale=ko", async () => {
    const stars = [{ id: "a" }, { id: "b" }];
    const result = await buildConstellations(
      stars,
      async () => ["a", "b"],
      "ko",
    );
    const koNames = CONSTELLATION_THEMES.map((t) => t.name.ko);
    for (const c of result) {
      expect(koNames).toContain(c.name);
    }
  });

  it("uses English theme names when locale=en", async () => {
    const stars = [{ id: "a" }, { id: "b" }];
    const result = await buildConstellations(
      stars,
      async () => ["a", "b"],
      "en",
    );
    const enNames = CONSTELLATION_THEMES.map((t) => t.name.en);
    for (const c of result) {
      expect(enNames).toContain(c.name);
    }
  });

  it("caps each constellation at perTheme stars", async () => {
    const stars = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}` }));
    const matchIds = stars.map((s) => s.id);
    const result = await buildConstellations(
      stars,
      async () => matchIds,
      "ko",
      3,
    );
    for (const c of result) {
      expect(c.starIds.length).toBeLessThanOrEqual(3);
    }
  });

  it("returns no constellations when every match function returns empty", async () => {
    const stars = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = await buildConstellations(stars, async () => []);
    expect(result).toEqual([]);
  });
});
