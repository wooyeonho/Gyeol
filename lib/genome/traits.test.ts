import { describe, it, expect } from "vitest";
import { generateInitialDNA, DEFAULT_NEW_DNA_AXES, type CreatureDNA } from "./dna";
import { getExpressedTraits, getTraitProfile, buildTraitPersonalityFragments, TRAIT_CATALOG } from "./traits";

describe("Trait Expression System", () => {
  it("expresses different traits for different DNA", () => {
    const dna1 = generateInitialDNA("trait-test-1");
    const dna2 = generateInitialDNA("trait-test-2");

    // Push dna1 toward empathy/warmth
    dna1.empathy = 0.85;
    dna1.warmth = 0.75;
    // Push dna2 toward analytical/spatial
    dna2.analytical = 0.85;
    dna2.spatial = 0.75;

    const traits1 = getExpressedTraits(dna1);
    const traits2 = getExpressedTraits(dna2);

    const ids1 = new Set(traits1.map((t) => t.id));
    const ids2 = new Set(traits2.map((t) => t.id));

    // They should have at least some different traits
    const intersection = [...ids1].filter((id) => ids2.has(id));
    expect(intersection.length).toBeLessThan(Math.max(ids1.size, ids2.size));
  });

  it("a high-empathy creature expresses heart_reader", () => {
    const dna = generateInitialDNA("heart-reader-test");
    dna.empathy = 0.85;
    dna.warmth = 0.70;
    const traits = getExpressedTraits(dna);
    expect(traits.some((t) => t.id === "heart_reader")).toBe(true);
  });

  it("a high-creativity creature expresses dream_weaver", () => {
    const dna = generateInitialDNA("dream-weaver-test");
    dna.creativity = 0.82;
    dna.intuitive = 0.72;
    const traits = getExpressedTraits(dna);
    expect(traits.some((t) => t.id === "dream_weaver")).toBe(true);
  });

  it("vanilla DNA expresses few or no traits", () => {
    const dna: CreatureDNA = {
      analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
      warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
      assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
      curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
      ...DEFAULT_NEW_DNA_AXES,
    };
    const traits = getExpressedTraits(dna);
    // Vanilla DNA (all 0.5) should express very few traits since most need 0.6+
    expect(traits.length).toBeLessThanOrEqual(2);
  });

  it("getTraitProfile sorts by tier", () => {
    const dna = generateInitialDNA("tier-test");
    dna.empathy = 0.95; // well above threshold → mastered
    dna.warmth = 0.90;
    const profile = getTraitProfile(dna);
    if (profile.length >= 2) {
      const tierOrder = { mastered: 3, expressed: 2, emerging: 1, latent: 0 };
      expect(tierOrder[profile[0].tier]).toBeGreaterThanOrEqual(tierOrder[profile[1].tier]);
    }
  });

  it("buildTraitPersonalityFragments returns strings", () => {
    const dna = generateInitialDNA("fragment-test");
    dna.empathy = 0.85;
    dna.warmth = 0.70;
    const fragments = buildTraitPersonalityFragments(dna, "en");
    expect(fragments.length).toBeGreaterThan(0);
    for (const f of fragments) {
      expect(typeof f).toBe("string");
      expect(f.length).toBeGreaterThan(0);
    }
  });

  it("all traits in catalog have required fields", () => {
    for (const trait of TRAIT_CATALOG) {
      expect(trait.id).toBeTruthy();
      expect(trait.name.ko).toBeTruthy();
      expect(trait.name.en).toBeTruthy();
      expect(trait.conditions.length).toBeGreaterThan(0);
      expect(trait.category).toBeTruthy();
    }
  });
});
