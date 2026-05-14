import { describe, expect, it } from "vitest";
import { deriveEvolutionSummary, getEvolutionCopy } from "./evolution-copy";

describe("deriveEvolutionSummary", () => {
  it("prioritizes memory moment", () => {
    expect(deriveEvolutionSummary({ hasMemoryMoment: true, dnaShift: ["curiosity"] })).toBe("memory");
  });

  it("maps dna and trait signals to user-facing buckets", () => {
    expect(deriveEvolutionSummary({ dnaShift: ["curiosity"] })).toBe("curiosity");
    expect(deriveEvolutionSummary({ dnaShift: ["playfulness"] })).toBe("playful");
    expect(deriveEvolutionSummary({ traitEmerged: [{ id: "heart_reader" }] })).toBe("trust");
    expect(deriveEvolutionSummary({ traitEmerged: [{ id: "quiet_anchor" }] })).toBe("deep");
  });
});

describe("getEvolutionCopy", () => {
  it("returns localized copy", () => {
    expect(getEvolutionCopy("trust", "ko")).toContain("신뢰");
    expect(getEvolutionCopy("trust", "en")).toContain("Trust");
  });
});

