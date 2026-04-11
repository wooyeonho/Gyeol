import { describe, expect, it } from "vitest";
import {
  dueHighlights,
  estimateReadingMinutes,
  extractTldr,
  pickDailyRecall,
  READER_PRINCIPLES,
  wordCount,
  type Highlight,
} from "./world-class-reader";

describe("READER_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(READER_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("extractTldr", () => {
  it("returns first N sentences", () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth.";
    const tldr = extractTldr(text, 2);
    expect(tldr).toContain("First sentence");
    expect(tldr).toContain("Second sentence");
    expect(tldr).not.toContain("Third sentence");
  });
  it("returns empty for empty input", () => {
    expect(extractTldr("")).toBe("");
  });
});

describe("estimateReadingMinutes / wordCount", () => {
  it("reads at least 1 minute", () => {
    expect(estimateReadingMinutes(10)).toBe(1);
  });
  it("ceils to the next minute", () => {
    expect(estimateReadingMinutes(221, 220)).toBe(2);
  });
  it("wordCount counts words not characters", () => {
    expect(wordCount("one two three")).toBe(3);
  });
});

describe("dueHighlights", () => {
  const now = 1_000_000_000_000;
  const oneDay = 24 * 3600 * 1000;
  const highlights: Highlight[] = [
    { id: "a", text: "a", articleId: "1", createdAt: 0, lastRecalled: now - 10 * oneDay, recallCount: 1 },
    { id: "b", text: "b", articleId: "1", createdAt: 0, lastRecalled: now - 2 * oneDay, recallCount: 1 },
  ];
  it("includes highlights past cooldown", () => {
    const due = dueHighlights(highlights, now, 7);
    expect(due.map((h) => h.id)).toEqual(["a"]);
  });
});

describe("pickDailyRecall", () => {
  const highlights: Highlight[] = Array.from({ length: 30 }, (_, i) => ({
    id: `h${i}`,
    text: "t",
    articleId: "1",
    createdAt: 0,
    lastRecalled: 0,
    recallCount: 0,
  }));
  it("is deterministic per dayKey", () => {
    const a = pickDailyRecall(highlights, "2026-04-11", 5);
    const b = pickDailyRecall(highlights, "2026-04-11", 5);
    expect(a.map((h) => h.id)).toEqual(b.map((h) => h.id));
  });
  it("returns exactly k items", () => {
    expect(pickDailyRecall(highlights, "2026-04-11", 5)).toHaveLength(5);
  });
  it("different days yield different picks", () => {
    const a = pickDailyRecall(highlights, "2026-04-11", 5).map((h) => h.id);
    const b = pickDailyRecall(highlights, "2026-04-12", 5).map((h) => h.id);
    expect(a).not.toEqual(b);
  });
});
