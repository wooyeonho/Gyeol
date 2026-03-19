import { describe, it, expect } from "vitest";
import { generateInitialDNA } from "./dna";
import { deriveSpecies } from "./species";
import { deriveMorphWeights, computeVertexDisplacements } from "./morph";

describe("MorphTarget System", () => {
  it("derives morph weights from DNA", () => {
    const dna = generateInitialDNA("morph-test-1");
    const species = deriveSpecies(dna);
    const morphs = deriveMorphWeights(dna, species);

    // All weights should be in 0..1
    for (const [, value] of Object.entries(morphs)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("produces different morphs for different DNA", () => {
    const dna1 = generateInitialDNA("morph-a");
    const dna2 = generateInitialDNA("morph-b");
    const species1 = deriveSpecies(dna1);
    const species2 = deriveSpecies(dna2);
    const m1 = deriveMorphWeights(dna1, species1);
    const m2 = deriveMorphWeights(dna2, species2);

    // At least some weights should differ
    const keys = Object.keys(m1) as (keyof typeof m1)[];
    const diffs = keys.filter((k) => Math.abs(m1[k] - m2[k]) > 0.01);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same DNA", () => {
    const dna = generateInitialDNA("morph-deterministic");
    const species = deriveSpecies(dna);
    const m1 = deriveMorphWeights(dna, species);
    const m2 = deriveMorphWeights(dna, species);
    expect(m1).toEqual(m2);
  });

  it("high-creativity DNA has higher crownGrowth", () => {
    const dna = generateInitialDNA("morph-creative");
    dna.creativity = 0.9;
    dna.intuitive = 0.8;
    const species = deriveSpecies(dna);
    const morphs = deriveMorphWeights(dna, species);

    const baseDNA = generateInitialDNA("morph-base");
    const baseSpecies = deriveSpecies(baseDNA);
    const baseMorphs = deriveMorphWeights(baseDNA, baseSpecies);

    expect(morphs.crownGrowth).toBeGreaterThan(baseMorphs.crownGrowth);
  });

  it("computes vertex displacements without NaN", () => {
    const dna = generateInitialDNA("morph-vertex");
    const species = deriveSpecies(dna);
    const morphs = deriveMorphWeights(dna, species);

    // Create a simple unit sphere positions array (6 vertices for testing)
    const positions = new Float32Array([
      0, 1, 0,   // top
      0, -1, 0,  // bottom
      1, 0, 0,   // right
      -1, 0, 0,  // left
      0, 0, 1,   // front
      0, 0, -1,  // back
    ]);

    const displacements = computeVertexDisplacements(positions, morphs);
    expect(displacements.length).toBe(positions.length);

    // No NaN values
    for (let i = 0; i < displacements.length; i++) {
      expect(Number.isNaN(displacements[i])).toBe(false);
    }
  });
});
