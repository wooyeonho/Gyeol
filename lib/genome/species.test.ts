import { describe, it, expect } from "vitest";
import { generateInitialDNA } from "./dna";
import { deriveSpecies } from "./species";

describe("deriveSpecies", () => {
  it("produces a species name in prefix-core-suffix format", () => {
    const dna = generateInitialDNA("test-species-1");
    const species = deriveSpecies(dna);
    expect(species.name).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });

  it("produces different species for different DNA", () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const dna = generateInitialDNA(`species-variety-${i}`);
      const species = deriveSpecies(dna);
      names.add(species.name);
    }
    // At least 5 distinct species from 20 creatures
    expect(names.size).toBeGreaterThanOrEqual(5);
  });

  it("is deterministic for the same DNA", () => {
    const dna = generateInitialDNA("deterministic-test");
    const s1 = deriveSpecies(dna);
    const s2 = deriveSpecies(dna);
    expect(s1).toEqual(s2);
  });

  it("assigns a valid archetype", () => {
    const validArchetypes = ["ethereal", "crystalline", "organic", "mechanical", "fluid", "volcanic", "spectral", "verdant"];
    const dna = generateInitialDNA("archetype-test");
    const species = deriveSpecies(dna);
    expect(validArchetypes).toContain(species.archetype);
  });

  it("assigns a valid motion style", () => {
    const validMotions = ["drift", "pulse", "orbit", "tremor", "bloom", "spiral"];
    const dna = generateInitialDNA("motion-test");
    const species = deriveSpecies(dna);
    expect(validMotions).toContain(species.motionStyle);
  });

  it("has rarity between 0 and 1", () => {
    for (let i = 0; i < 10; i++) {
      const dna = generateInitialDNA(`rarity-${i}`);
      const species = deriveSpecies(dna);
      expect(species.rarity).toBeGreaterThanOrEqual(0);
      expect(species.rarity).toBeLessThanOrEqual(1);
    }
  });
});
