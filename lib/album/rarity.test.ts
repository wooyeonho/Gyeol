import { describe, it, expect } from "vitest";
import { getRarity, getCollectionCompleteness, ALL_MILESTONE_TYPES } from "./rarity";

describe("getRarity", () => {
  it("returns common for first_chat", () => {
    const r = getRarity("first_chat");
    expect(r.tier).toBe("common");
    expect(r.color).toBeTruthy();
    expect(r.label.en).toBe("Common");
    expect(r.label.ko).toBe("일반");
  });

  it("returns uncommon for dream", () => {
    expect(getRarity("dream").tier).toBe("uncommon");
  });

  it("returns uncommon for artifact_creation and social_encounter", () => {
    expect(getRarity("artifact_creation").tier).toBe("uncommon");
    expect(getRarity("social_encounter").tier).toBe("uncommon");
  });

  it("returns rare for evolution and self_naming", () => {
    expect(getRarity("evolution").tier).toBe("rare");
    expect(getRarity("self_naming").tier).toBe("rare");
  });

  it("returns epic for personality_evolution and perspective_journal", () => {
    expect(getRarity("personality_evolution").tier).toBe("epic");
    expect(getRarity("perspective_journal").tier).toBe("epic");
  });

  it("returns legendary for species_emergence", () => {
    expect(getRarity("species_emergence").tier).toBe("legendary");
  });

  it("returns common default for unknown types", () => {
    const r = getRarity("totally_unknown");
    expect(r.tier).toBe("common");
  });
});

describe("getCollectionCompleteness", () => {
  it("returns 0% for empty collection", () => {
    const result = getCollectionCompleteness([]);
    expect(result.collected).toBe(0);
    expect(result.total).toBe(ALL_MILESTONE_TYPES.length);
    expect(result.percent).toBe(0);
  });

  it("calculates percentage for partial collection", () => {
    const result = getCollectionCompleteness(["first_chat", "dream"]);
    expect(result.collected).toBe(2);
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
  });

  it("returns 100% for complete collection", () => {
    const result = getCollectionCompleteness(ALL_MILESTONE_TYPES);
    expect(result.collected).toBe(ALL_MILESTONE_TYPES.length);
    expect(result.percent).toBe(100);
  });

  it("deduplicates collected types", () => {
    const result = getCollectionCompleteness(["first_chat", "first_chat", "first_chat"]);
    expect(result.collected).toBe(1);
  });

  it("ignores unknown types", () => {
    const result = getCollectionCompleteness(["unknown_type"]);
    expect(result.collected).toBe(0);
  });
});

describe("ALL_MILESTONE_TYPES", () => {
  it("has 9 milestone types", () => {
    expect(ALL_MILESTONE_TYPES.length).toBe(9);
  });

  it("includes key types", () => {
    expect(ALL_MILESTONE_TYPES).toContain("first_chat");
    expect(ALL_MILESTONE_TYPES).toContain("evolution");
    expect(ALL_MILESTONE_TYPES).toContain("species_emergence");
  });
});
