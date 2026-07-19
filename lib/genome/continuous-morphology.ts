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

  // Limbs: most creatures should have at least small stubs
  const limbPotential = dna.assertiveness * 3 + dna.adaptability * 2 + dna.independence;
  const limbCount = Math.max(1.5, limbPotential * evoCapacity.dnaExpressionRange);

  const eyePotential = 1 + dna.intuitive * 2 + dna.curiosity * 1 + dna.empathy * 0.5;
  // Minimum 2 eyes (no cyclops by default) — third eye unlocks at higher potential
  const eyeCount = Math.max(2, eyePotential * evoCapacity.dnaExpressionRange);

  // Horns: scale continuously from low DNA values instead of cutting off near avg.
  // Previous threshold (2.5) meant most mid-DNA creatures showed zero horns.
  const hornPotential = dna.intensity * 2 + dna.assertiveness * 1.5;
  const hornCount = hornPotential > 1.2
    ? (hornPotential - 1.2) * 2 * evoCapacity.dnaExpressionRange
    : 0;

  // Antennae: available to mildly curious/intuitive creatures, not only extremes.
  const antennaPotential = dna.curiosity * 1.2 + dna.intuitive * 0.8;
  const antennaCount = antennaPotential > 0.8
    ? (antennaPotential - 0.8) * 2.5 * evoCapacity.dnaExpressionRange
    : 0;

  // Tail: no negative offset — playful+adaptable creatures always get a visible tail.
  const tailPresence = Math.max(0,
    (dna.playfulness * 0.6 + dna.adaptability * 0.3) * evoCapacity.dnaExpressionRange,
  );

  // Fin/wing: lower offset so adaptable/open creatures get visible fins.
  const finWingSize = Math.max(0,
    (dna.adaptability * 0.5 + dna.openness * 0.3 - 0.1) * evoCapacity.dnaExpressionRange,
  );

  // Spikes: lower cutoff so assertive creatures show them at mid DNA values.
  const spikePotential = dna.assertiveness * 4 + dna.intensity * 4;
  const spikeCount = spikePotential > 3
    ? (spikePotential - 3) * 2 * evoCapacity.dnaExpressionRange
    : 0;

  // Ear bumps: no negative offset, empathic/warm creatures show them by default.
  const earBumpSize = Math.max(0,
    (dna.empathy * 0.5 + dna.warmth * 0.3) * evoCapacity.dnaExpressionRange,
  );

  const appendageVariety = dna.creativity * 0.6 + dna.openness * 0.4;

  // ── Open ranges: only enforce physical minimums ──
  // DNA + evolution capacity determine actual range — not developer clamps.
  return {
    bodySegments: Math.max(1, bodySegments),
    bodyRatio: Math.max(0, bodyRatio), // no upper bound — elongated creatures allowed
    bodySymmetry: Math.max(0, bodySymmetry), // no upper bound
    surfaceHardness: Math.max(0, surfaceHardness), // no upper bound
    surfaceComplexity: Math.max(0, surfaceComplexity), // no upper bound
    limbCount: Math.max(0, limbCount),
    eyeCount: Math.max(1, eyeCount),
    hornCount: Math.max(0, hornCount),
    antennaCount: Math.max(0, antennaCount),
    tailPresence,
    finWingSize,
    spikeCount: Math.max(0, spikeCount),
    earBumpSize,
    appendageVariety: Math.max(0, appendageVariety), // no upper bound
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

  // No upper clamp — strong DNA resonance can push weights above 1.0
  // Only prevent negative weights (meaningless)
  return {
    ethereal: Math.max(0, ethereal),
    crystalline: Math.max(0, crystalline),
    organic: Math.max(0, organic),
    mechanical: Math.max(0, mechanical),
    fluid: Math.max(0, fluid),
    volcanic: Math.max(0, volcanic),
    spectral: Math.max(0, spectral),
    verdant: Math.max(0, verdant),
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

  // Logarithmic growth: fast early, asymptotic later but never capped.
  // Gen 1 baseline raised from 0.3 → 0.7 so new creatures have VISIBLE
  // distinctive features (horns, antennae, tail, ears) instead of being
  // a smooth eyes-on-sphere blob. Evolution still adds more, but every
  // agent starts as a recognisable character.
  // Gen 1: 0.70, Gen 5: 0.87, Gen 10: 0.94, Gen 20: 0.98, Gen 50: ~1.05
  const expressionBase = 0.7 + 0.3 * (1 - 1 / (1 + (gen - 1) * 0.2));
  // Slow linear growth beyond the asymptote (never truly capped)
  const expressionGrowth = Math.max(0, (gen - 10) * 0.005);
  const dnaExpressionRange = expressionBase + expressionGrowth;

  // Morphological complexity: 0.55 at Gen 1 (raised from 0.2), approaches 1.0 around Gen 8.
  // Higher baseline means Gen 1 creatures already have body structure, not a plain sphere.
  const morphBase = 0.55 + 0.45 * (1 - 1 / (1 + (gen - 1) * 0.3));
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
    subdivisions: Math.round(Math.max(1, subdivisions)),
    faceting: Math.max(0, faceting),
    radius: 0.42,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

 

function _clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
