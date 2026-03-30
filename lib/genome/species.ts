/**
 * Procedural Species System
 *
 * Instead of 4 hardcoded species, creatures organically develop a species
 * identity from their DNA profile. Species names are generated from
 * trait combinations, creating thousands of unique possibilities.
 *
 * Species structure: "{prefix}-{core}-{suffix}"
 * - prefix: derived from dominant cognitive trait
 * - core: derived from dominant emotional trait
 * - suffix: derived from dominant social/meta trait
 *
 * Examples: "lux-ember-weaver", "void-frost-keeper", "prism-tide-wanderer"
 */

import type { CreatureDNA, DNAAxis } from "./dna";
import { DNA_AXES } from "./dna";
import { type ArchetypeBlend, computeArchetypeBlendWeights } from "./continuous-morphology";

export type SpeciesProfile = {
  /** Generated species name, e.g. "lux-ember-wanderer" */
  name: string;
  /** Visual archetype for 3D rendering (dominant archetype for backward compat) */
  archetype: "ethereal" | "crystalline" | "organic" | "mechanical" | "fluid" | "volcanic" | "spectral" | "verdant";
  /** Continuous archetype blend weights — enables crystalline 60% + organic 40% */
  archetypeBlend: ArchetypeBlend;
  /** Movement style */
  motionStyle: "drift" | "pulse" | "orbit" | "tremor" | "bloom" | "spiral";
  /** Dominant element for visual effects */
  element: "light" | "shadow" | "fire" | "ice" | "nature" | "void" | "storm" | "crystal";
  /** Rarity score 0..1 based on trait extremity */
  rarity: number;
};

// Prefix: cognitive dominance
const PREFIXES: Record<string, string[]> = {
  analytical: ["calc", "cipher", "logi", "prism"],
  intuitive: ["myst", "oracle", "sense", "veil"],
  verbal: ["echo", "verse", "hymn", "lore"],
  spatial: ["nexus", "arc", "void", "flux"],
};

// Core: emotional dominance
const CORES: Record<string, string[]> = {
  warmth: ["ember", "glow", "sol", "bloom"],
  intensity: ["storm", "blaze", "fury", "surge"],
  stability: ["stone", "root", "anchor", "core"],
  openness: ["tide", "drift", "mist", "flow"],
};

// Suffix: social/meta dominance
const SUFFIXES: Record<string, string[]> = {
  assertiveness: ["commander", "herald", "striker", "forge"],
  empathy: ["keeper", "weaver", "tender", "bond"],
  playfulness: ["dancer", "spark", "jester", "whirl"],
  independence: ["wanderer", "ghost", "loner", "shade"],
  curiosity: ["seeker", "scout", "finder", "lens"],
  persistence: ["warden", "vigil", "sentinel", "hold"],
  adaptability: ["shifter", "morph", "flux", "wave"],
  creativity: ["dreamer", "maker", "artist", "bloom"],
};

const ARCHETYPES: { condition: (dna: CreatureDNA) => boolean; archetype: SpeciesProfile["archetype"] }[] = [
  { condition: (d) => d.analytical > 0.7 && d.stability > 0.6, archetype: "crystalline" },
  { condition: (d) => d.intuitive > 0.7 && d.openness > 0.6, archetype: "ethereal" },
  { condition: (d) => d.intensity > 0.7 && d.assertiveness > 0.6, archetype: "volcanic" },
  { condition: (d) => d.warmth > 0.65 && d.empathy > 0.65, archetype: "organic" },
  { condition: (d) => d.spatial > 0.65 && d.analytical > 0.55, archetype: "mechanical" },
  { condition: (d) => d.openness > 0.7 && d.adaptability > 0.6, archetype: "fluid" },
  { condition: (d) => d.independence > 0.7 && d.intuitive > 0.55, archetype: "spectral" },
  { condition: (d) => d.creativity > 0.65 && d.warmth > 0.55, archetype: "verdant" },
];

const MOTIONS: { condition: (dna: CreatureDNA) => boolean; style: SpeciesProfile["motionStyle"] }[] = [
  { condition: (d) => d.stability > 0.7, style: "pulse" },
  { condition: (d) => d.playfulness > 0.65, style: "spiral" },
  { condition: (d) => d.creativity > 0.65, style: "bloom" },
  { condition: (d) => d.intensity > 0.65, style: "tremor" },
  { condition: (d) => d.spatial > 0.6, style: "orbit" },
];

const ELEMENTS: { condition: (dna: CreatureDNA) => boolean; element: SpeciesProfile["element"] }[] = [
  { condition: (d) => d.warmth > 0.7 && d.intensity > 0.6, element: "fire" },
  { condition: (d) => d.stability > 0.7 && d.analytical > 0.6, element: "crystal" },
  { condition: (d) => d.openness > 0.7 && d.intuitive > 0.6, element: "light" },
  { condition: (d) => d.independence > 0.7, element: "shadow" },
  { condition: (d) => d.creativity > 0.65 && d.warmth > 0.55, element: "nature" },
  { condition: (d) => d.intensity > 0.7 && d.assertiveness > 0.5, element: "storm" },
  { condition: (d) => d.stability > 0.6 && d.analytical > 0.55, element: "ice" },
];

function pickFromDNA(options: string[], dna: CreatureDNA, axis: DNAAxis): string {
  const idx = Math.floor(dna[axis] * options.length) % options.length;
  return options[idx];
}

function findDominantInGroup(dna: CreatureDNA, axes: DNAAxis[]): DNAAxis {
  let best = axes[0];
  for (const axis of axes) {
    if (dna[axis] > dna[best]) best = axis;
  }
  return best;
}

/**
 * Calculate species rarity based on how extreme the DNA values are.
 * More polarized = rarer creature.
 */
function calculateRarity(dna: CreatureDNA): number {
  let extremity = 0;
  for (const axis of DNA_AXES) {
    // Distance from center (0.5)
    extremity += Math.abs(dna[axis] - 0.5) * 2;
  }
  return Math.min(1, extremity / DNA_AXES.length);
}

/**
 * Derive a species profile from DNA.
 * The same DNA always produces the same species (deterministic).
 */
export function deriveSpecies(dna: CreatureDNA): SpeciesProfile {
  // Find dominant traits in each category
  const cogDominant = findDominantInGroup(dna, ["analytical", "intuitive", "verbal", "spatial"]);
  const emoDominant = findDominantInGroup(dna, ["warmth", "intensity", "stability", "openness"]);
  const socialAxes: DNAAxis[] = ["assertiveness", "empathy", "playfulness", "independence", "curiosity", "persistence", "adaptability", "creativity"];
  const socialDominant = findDominantInGroup(dna, socialAxes);

  const prefixOptions = PREFIXES[cogDominant] ?? ["entity"];
  const coreOptions = CORES[emoDominant] ?? ["being"];
  const suffixOptions = SUFFIXES[socialDominant] ?? ["one"];

  const prefix = pickFromDNA(prefixOptions, dna, cogDominant);
  const core = pickFromDNA(coreOptions, dna, emoDominant);
  const suffix = pickFromDNA(suffixOptions, dna, socialDominant);

  // Continuous archetype blend — no longer picks just one
  const archetypeBlend = computeArchetypeBlendWeights(dna);
  // Dominant archetype for backward compat (used by geometry selection, etc.)
  const archetype = ARCHETYPES.find((a) => a.condition(dna))?.archetype ?? "organic";
  const motionStyle = MOTIONS.find((m) => m.condition(dna))?.style ?? "drift";
  const element = ELEMENTS.find((e) => e.condition(dna))?.element ?? "void";
  const rarity = calculateRarity(dna);

  return {
    name: `${prefix}-${core}-${suffix}`,
    archetype,
    archetypeBlend,
    motionStyle,
    element,
    rarity,
  };
}
