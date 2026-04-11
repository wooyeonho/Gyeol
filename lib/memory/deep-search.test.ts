import { describe, it, expect } from "vitest";
import { rankDeepSearch, parseQueryToFilters, type MemoryRow } from "./deep-search";

const now = Date.now();
const day = 86400 * 1000;

function m(partial: Partial<MemoryRow>): MemoryRow {
  return {
    id: partial.id ?? Math.random().toString(36),
    content: partial.content ?? "",
    createdAt: partial.createdAt ?? now,
    ...partial,
  };
}

describe("deep memory search", () => {
  it("applies the temporal bucket filter", () => {
    const mems = [
      m({ id: "today", createdAt: now - 2 * 3600_000, similarity: 0.5 }),
      m({ id: "last_year", createdAt: now - 400 * day, similarity: 0.99 }),
    ];
    const out = rankDeepSearch(mems, { bucket: "today" });
    expect(out).toHaveLength(1);
    expect(out[0].memory.id).toBe("today");
  });

  it("filters by mood when specified", () => {
    const mems = [
      m({ id: "sad", mood: "melancholy", similarity: 0.5 }),
      m({ id: "happy", mood: "joyful", similarity: 0.9 }),
    ];
    const out = rankDeepSearch(mems, { moods: ["melancholy"] });
    expect(out.map((r) => r.memory.id)).toEqual(["sad"]);
  });

  it("drops candidates below minSimilarity", () => {
    const mems = [
      m({ id: "weak", similarity: 0.1 }),
      m({ id: "strong", similarity: 0.8 }),
    ];
    const out = rankDeepSearch(mems, { minSimilarity: 0.5 });
    expect(out.map((r) => r.memory.id)).toEqual(["strong"]);
  });

  it("boosts important memories", () => {
    const mems = [
      m({ id: "normal", similarity: 0.8, createdAt: now - 30 * day }),
      m({ id: "important", similarity: 0.7, importance: 0.9, createdAt: now - 30 * day }),
    ];
    const out = rankDeepSearch(mems);
    expect(out[0].memory.id).toBe("important");
    expect(out[0].reasons).toContain("important memory");
  });

  it("boosts very recent memories", () => {
    const mems = [
      m({ id: "old", similarity: 0.82, createdAt: now - 60 * day }),
      m({ id: "recent", similarity: 0.78, createdAt: now - 2 * 3600_000 }),
    ];
    const out = rankDeepSearch(mems);
    expect(out[0].memory.id).toBe("recent");
  });

  it("parses temporal hints from natural language", () => {
    expect(parseQueryToFilters("what did we talk about today?").bucket).toBe("today");
    expect(parseQueryToFilters("이번 주 얘기").bucket).toBe("this_week");
    expect(parseQueryToFilters("예전에 나눈 이야기").bucket).toBe("long_ago");
  });

  it("parses mood hints", () => {
    const f = parseQueryToFilters("슬픔에 빠졌던 날");
    expect(f.moods).toContain("melancholy");
    const f2 = parseQueryToFilters("happy memories");
    expect(f2.moods).toContain("joyful");
  });

  it("returns empty filters for a plain query", () => {
    const f = parseQueryToFilters("about the cat");
    expect(f.bucket).toBeUndefined();
    expect(f.moods).toBeUndefined();
  });
});
