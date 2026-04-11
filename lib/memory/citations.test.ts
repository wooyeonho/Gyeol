import { describe, it, expect } from "vitest";
import {
  buildCitation,
  injectCitationMarkers,
  rankCitations,
} from "./citations";

describe("memory citations", () => {
  it("builds a citation with a friendly relative label", () => {
    const c = buildCitation({
      memoryId: "mem_1",
      content: "   lots   of   whitespace  here ",
      formedAt: Date.now() - 60_000,
    });
    expect(c.memoryId).toBe("mem_1");
    expect(c.snippet).toBe("lots of whitespace here");
    expect(c.label).toMatch(/분 전 기억/);
  });

  it("truncates long snippets", () => {
    const long = "word ".repeat(200);
    const c = buildCitation({
      memoryId: "m",
      content: long,
      formedAt: Date.now(),
    });
    expect(c.snippet!.length).toBeLessThanOrEqual(160);
    expect(c.snippet!.endsWith("…")).toBe(true);
  });

  it("handles null content for semantic matches", () => {
    const c = buildCitation({
      memoryId: "m",
      content: null,
      formedAt: Date.now(),
      mode: "semantic_match",
    });
    expect(c.snippet).toBeNull();
    expect(c.mode).toBe("semantic_match");
  });

  it("injects footnote markers at the end of the first paragraph", () => {
    const cites = [
      buildCitation({ memoryId: "a", content: "A", formedAt: Date.now() }),
      buildCitation({ memoryId: "b", content: "B", formedAt: Date.now() }),
    ];
    const reply = "First paragraph here.\n\nSecond paragraph.";
    const out = injectCitationMarkers(reply, cites);
    expect(out).toContain("[1]");
    expect(out).toContain("[2]");
    expect(out.split("\n\n")[0]).toContain("[1]");
    expect(out.split("\n\n")[1]).toBe("Second paragraph.");
  });

  it("returns the reply unchanged when no citations", () => {
    expect(injectCitationMarkers("hi", [])).toBe("hi");
  });

  it("ranks by similarity with a freshness boost", () => {
    const now = Date.now();
    const out = rankCitations(
      [
        { memoryId: "old", similarity: 0.9, formedAt: now - 365 * 86400 * 1000 },
        { memoryId: "fresh", similarity: 0.85, formedAt: now - 1000 },
      ],
      2,
    );
    expect(out).toHaveLength(2);
    // Fresh should edge out the slightly-more-similar old one thanks to boost.
    expect(out[0].memoryId).toBe("fresh");
  });

  it("respects the limit parameter", () => {
    const now = Date.now();
    const many = Array.from({ length: 10 }, (_, i) => ({
      memoryId: `m${i}`,
      similarity: 0.5 + i * 0.01,
      formedAt: now - i * 3600_000,
    }));
    expect(rankCitations(many, 3)).toHaveLength(3);
  });
});
