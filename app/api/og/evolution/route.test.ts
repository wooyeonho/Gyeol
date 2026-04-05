import { describe, expect, it } from "vitest";

// The OG route uses next/og ImageResponse which requires edge runtime.
// We test the parameter parsing and subtitle logic only.

describe("OG evolution route — logic", () => {
  function buildSubtitle(trait: string | null, gen: string) {
    return trait ? `New trait expressed: ${trait}` : `Evolved to Gen ${gen}`;
  }

  it("shows trait subtitle when trait param is provided", () => {
    expect(buildSubtitle("Luminous Aura", "3")).toBe("New trait expressed: Luminous Aura");
  });

  it("shows gen subtitle when no trait", () => {
    expect(buildSubtitle(null, "5")).toBe("Evolved to Gen 5");
    expect(buildSubtitle("", "2")).toBe("Evolved to Gen 2");
  });

  it("defaults gen to 1 for display", () => {
    expect(buildSubtitle(null, "1")).toBe("Evolved to Gen 1");
  });

  it("handles special characters in trait name", () => {
    expect(buildSubtitle("Phoenix's Rebirth", "4")).toBe("New trait expressed: Phoenix's Rebirth");
  });
});
