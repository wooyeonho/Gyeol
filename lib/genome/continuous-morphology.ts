/**
 * Continuous Morphology Engine
 *
 * Replaces discrete archetype selection (1-of-8) with a continuous parameter
 * space where every creature occupies a unique point. No two creatures can
 * look the same because the morphology is a continuous function of DNA.
 *
 * Key transitions:
 * - Discrete archetype → continuous blend weights (crystalline 60% + organic 40%)
 * - Binary appendage on/off → continuous count/size/position
 * - Fixed Gen 1-5 → open-ended evolution capacity
 * - Fixed eye count (1/2/3) → continuous (2.3 = third eye at 30% opacity)
 *
 * Design: DNA dimensions directly drive mesh generation parameters.
 * The archetype system is kept as "attractors" in the continuous space —
 * they influence the morphology but don't discretize it.
 */

import type { CreatureDNA } from "./dna";

// ─── Types ───────────────────────────────────────────────────────────

/** Continuous blend weights for each archetype (sum may exceed 1) */
export type ArchetypeBlend = {
  ethereal: number;
  crystalline: number;
  organic: number;
  mechanical: number;
  fluid: number;
  volcanic: number;
  spectral: number;
  verdant: number;
};

export type ArchetypeKey = keyof ArchetypeBlend;

export const ARCHETYPE_KEYS: ArchetypeKey[] = [
  "ethereal", "crystalline", "organic", "mechanical",
  "fluid", "volcanic", "spectral", "verdant",
];

/** Continuous morphology — all values are continuous, not discrete */
export type ContinuousMorphology = {
  // ── Body shape ──
  /** Number of body segments (1-6+, fractional = growing) */
  bodySegments: number;
  /** Body ratio: 0 = compact sphere, 1 = elongated */
  bodyRatio: number;
  /** Bilateral symmetry: 0 = asymmetric, 1 = perfect mirror */
  bodySymmetry: number;
  /** Surface hardness: 0 = soft/organic, 1 = crystalline/hard */
  surfaceHardness: number;
  /** Surface complexity: 0 = smooth, 1 = detailed/textured */
  surfaceComplexity: number;

  // ── Appendages (continuous counts — fractional = partially grown) ──
  /** Limb count (0-8+, e.g., 2.7 = third limb at 70% growth) */
  limbCount: number;
  /** Eye count (1-5+, e.g., 2.3 = third eye at 30% opacity) */
  eyeCount: number;
  /** Horn count (0-4, continuous) */
  hornCount: number;
  /** Antenna count (0-2, continuous) */
  antennaCount: number;
  /** Tail length (0 = no tail, 1 = full tail) */
  tailPresence: number;
  /** Fin/wing size (0 = none, 1 = fully developed) */
  finWingSize: number;
  /** Spike count (0-12+, continuous) */
  spikeCount: number;
  /** Ear/bump size (0 = none, 1 = fully developed) */
  earBumpSize: number;

  /** How much appendages vary from each other (0 = identical, 1 = unique) */
  appendageVariety: number;

  // ── Texture blending (multiple textures coexist) ──
  /** Archetype blend weights — determines visual texture mix */
  archetypeBlend: ArchetypeBlend;

  // ── Evolution capacity ──
  /** How strongly DNA expresses in the phenotype (grows with Gen) */
  dnaExpressionRange: number;
  /** Maximum morphological complexity this creature can achieve */
  morphComplexity: number;
};

// ─── Core Derivation ─────────────────────────────────────────────────

/**
 * Derive continuous morphology from DNA and evolution level.
 *
 * Unlike the old system which picks 1 archetype, this produces a point
 * in a continuous multi-dimensional morphology space. The result is
 * deterministic (same DNA + genLevel always produces the same morphology).
 *
 * @param dna — 16-dimensional DNA vector
 * @param genLevel — evolution generation (1+, no upper bound)
 */
export function deriveContinuousMorphology(
  dna: CreatureDNA,
  genLevel: number,
): ContinuousMorphology {
  // Evolution capacity: grows with gen level, no upper bound
  // Gen 1: limited expression. Gen 10+: full DNA influence.
  const evoCapacity = getEvolutionCapacity(genLevel);

  // ── Archetype blend weights ──
  // Instead of picking one, compute affinity to each archetype.
  // DNA combinations that strongly match an archetype get higher weight.
  const archetypeBlend = computeArchetypeBlendWeights(dna);

  // ── Body shape (DNA → continuous params, scaled by evolution capacity) ──
  const bodySegments = 1 + dna.persistence * 3 * evoCapacity.morphComplexity
    + dna.analytical * 1.5 * evoCapacity.morphComplexity;

  const bodyRatio = 0.3 + dna.verbal * 0.3 + dna.spatial * 0.2
    - dna.stability * 0.15;

  const bodySymmetry = 0.3 + dna.stability * 0.35 + dna.analytical * 0.2
    - dna.creativity * 0.15;

  const surfaceHardness = dna.analytical * 0.4 + dna.persistence * 0.3
    - dna.warmth * 0.15 - dna.playfulness * 0.1;

  const surfaceComplexity = dna.creativity * 0.35 + dna.openness * 0.25
    + evoCapacity.morphComplexity * 0.2;

  // ── Appendages (continuous, scaled by evolution capacity) ──
  // Each appendage type has a "potential" from DNA. Evolution capacity
  // determines how much of that potential is expressed.

  const limbPotential = dna.assertiveness * 3 + dna.adaptability * 2 + dna.independence;
  const limbCount = limbPotential * evoCapacity.dnaExpressionRange;

  const eyePotential = 1 + dna.intuitive * 2 + dna.curiosity * 1 + dna.empathy * 0.5;
  const eyeCount = Math.max(1, eyePotential * evoCapacity.dnaExpressionRange);

  const hornPotential = dna.intensity * 2 + dna.assertiveness * 1.5;
  const hornCount = hornPotential > 1.2
    ? (hornPotential - 1.2) * 2 * evoCapacity.dnaExpressionRange
    : 0;

  const antennaPotential = dna.curiosity * 1.2 + dna.intuitive * 0.8;
  const antennaCount = antennaPotential > 0.8
    ? Math.min(2, (antennaPotential - 0.8) * 2.5 * evoCapacity.dnaExpressionRange)
    : 0;

  const tailPresence = clamp01(
    (dna.playfulness * 0.6 + dna.adaptability * 0.3 - 0.2) * evoCapacity.dnaExpressionRange,
  );

  const finWingSize = clamp01(
    (dna.adaptability * 0.5 + dna.openness * 0.3 - 0.25) * evoCapacity.dnaExpressionRange,
  );

  const spikePotential = dna.assertiveness * 4 + dna.intensity * 4;
  const spikeCount = spikePotential > 2
    ? (spikePotential - 2) * 2 * evoCapacity.dnaExpressionRange
    : 0;

  const earBumpSize = clamp01(
    (dna.empathy * 0.5 + dna.warmth * 0.3 - 0.2) * evoCapacity.dnaExpressionRange,
  );

  const appendageVariety = dna.creativity * 0.6 + dna.openness * 0.4;

  return {
    bodySegments: Math.max(1, bodySegments),
    bodyRatio: clamp01(bodyRatio),
    bodySymmetry: clamp01(bodySymmetry),
    surfaceHardness: clamp01(surfaceHardness),
    surfaceComplexity: clamp01(surfaceComplexity),
    limbCount: Math.max(0, limbCount),
    eyeCount: Math.max(1, eyeCount),
    hornCount: Math.max(0, hornCount),
    antennaCount: Math.max(0, antennaCount),
    tailPresence,
    finWingSize,
    spikeCount: Math.max(0, spikeCount),
    earBumpSize,
    appendageVariety: clamp01(appendageVariety),
    archetypeBlend,
    dnaExpressionRange: evoCapacity.dnaExpressionRange,
    morphComplexity: evoCapacity.morphComplexity,
  };
}

// ─── Archetype Blending ──────────────────────────────────────────────

/**
 * Compute continuous blend weights for all 8 archetypes.
 * Each weight represents how much this DNA "wants" to be that archetype.
 * Weights are NOT mutually exclusive — a creature can be 60% crystalline
 * AND 40% organic simultaneously.
 */
export function computeArchetypeBlendWeights(dna: CreatureDNA): ArchetypeBlend {
  // Each archetype has a "resonance function" — how well the DNA matches
  const ethereal = dna.intuitive * 0.4 + dna.openness * 0.3 + dna.creativity * 0.2 - dna.analytical * 0.1;
  const crystalline = dna.analytical * 0.4 + dna.stability * 0.3 + dna.persistence * 0.15 - dna.warmth * 0.1;
  const organic = dna.warmth * 0.35 + dna.empathy * 0.3 + dna.adaptability * 0.15 - dna.analytical * 0.1;
  const mechanical = dna.spatial * 0.35 + dna.analytical * 0.25 + dna.persistence * 0.2 - dna.creativity * 0.1;
  const fluid = dna.openness * 0.35 + dna.adaptability * 0.3 + dna.playfulness * 0.15 - dna.stability * 0.1;
  const volcanic = dna.intensity * 0.4 + dna.assertiveness * 0.3 + dna.persistence * 0.15 - dna.empathy * 0.1;
  const spectral = dna.independence * 0.35 + dna.intuitive * 0.25 + dna.curiosity * 0.15 - dna.warmth * 0.1;
  const verdant = dna.creativity * 0.3 + dna.warmth * 0.25 + dna.openness * 0.2 - dna.assertiveness * 0.1;

  return {
    ethereal: clamp01(ethereal),
    crystalline: clamp01(crystalline),
    organic: clamp01(organic),
    mechanical: clamp01(mechanical),
    fluid: clamp01(fluid),
    volcanic: clamp01(volcanic),
    spectral: clamp01(spectral),
    verdant: clamp01(verdant),
  };
}

/**
 * Get the dominant archetype (highest blend weight).
 * Used for backward compatibility where a single archetype is needed.
 */
export function getDominantArchetype(blend: ArchetypeBlend): ArchetypeKey {
  let best: ArchetypeKey = "organic";
  let bestValue = 0;
  for (const key of ARCHETYPE_KEYS) {
    if (blend[key] > bestValue) {
      bestValue = blend[key];
      best = key;
    }
  }
  return best;
}

// ─── Open-Ended Evolution ────────────────────────────────────────────

export type EvolutionCapacity = {
  /** How strongly DNA expresses in phenotype (0.3 at Gen 1 → 1.0+ at Gen 10+) */
  dnaExpressionRange: number;
  /** Maximum morphological complexity (mesh detail, appendage variety) */
  morphComplexity: number;
  /** Maximum possible limbs at this gen level */
  maxLimbs: number;
  /** Maximum possible eyes */
  maxEyes: number;
  /** Maximum appendage types */
  maxAppendageTypes: number;
};

/**
 * Compute evolution capacity from generation level.
 * No upper bound — Gen 50 and Gen 100 are valid.
 *
 * The function uses logarithmic scaling so early gens see dramatic change
 * while later gens see diminishing (but never zero) returns.
 */
export function getEvolutionCapacity(genLevel: number): EvolutionCapacity {
  const gen = Math.max(1, genLevel);

  // Logarithmic growth: fast early, asymptotic later but never capped
  // Gen 1: 0.3, Gen 5: 0.7, Gen 10: 0.85, Gen 20: 0.95, Gen 50: ~1.05
  const expressionBase = 0.3 + 0.7 * (1 - 1 / (1 + (gen - 1) * 0.2));
  // Slow linear growth beyond the asymptote (never truly capped)
  const expressionGrowth = Math.max(0, (gen - 10) * 0.005);
  const dnaExpressionRange = expressionBase + expressionGrowth;

  // Morphological complexity: 0.2 at Gen 1, approaches 1.0 around Gen 8
  // Asymptotic base curve + linear bonus beyond Gen 10 (can exceed 1.0 at high gens)
  const morphBase = 0.2 + 0.8 * (1 - 1 / (1 + (gen - 1) * 0.3));
  const morphBonus = gen > 10 ? (gen - 10) * 0.01 : 0;
  const morphComplexity = morphBase + morphBonus;

  return {
    dnaExpressionRange,
    morphComplexity: Math.max(0.2, morphComplexity),
    maxLimbs: Math.floor(2 + gen * 0.6),
    maxEyes: Math.floor(1 + gen * 0.4),
    maxAppendageTypes: Math.floor(1 + gen * 0.5),
  };
}

// ─── Geometry Blending Helper ────────────────────────────────────────

/**
 * Blend geometry parameters based on archetype weights.
 * Used by the renderer to interpolate between archetype base geometries.
 */
export type BlendedGeometryParams = {
  /** Subdivision level (higher = smoother) */
  subdivisions: number;
  /** 0 = round (icosahedron), 1 = faceted (octahedron/dodecahedron) */
  faceting: number;
  /** Base radius */
  radius: number;
};

export function blendGeometryParams(
  blend: ArchetypeBlend,
  morphComplexity: number,
): BlendedGeometryParams {
  // Each archetype influences geometry differently
  let subdivisions = 2; // base
  let faceting = 0;

  // Crystalline/mechanical push toward faceted
  faceting += blend.crystalline * 0.6 + blend.mechanical * 0.4;
  // Organic/fluid push toward smooth
  subdivisions += blend.organic * 2 + blend.fluid * 1.5 + blend.ethereal * 2;
  // Volcanic adds roughness
  faceting += blend.volcanic * 0.3;
  // Complexity adds detail
  subdivisions += morphComplexity * 1.5;

  return {
    subdivisions: Math.round(Math.max(1, Math.min(6, subdivisions))),
    faceting: clamp01(faceting),
    radius: 0.42,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
