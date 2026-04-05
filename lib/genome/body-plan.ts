/**
 * Continuous Body Structure System
 *
 * NO categories. NO templates. NO predefined body plans.
 *
 * DNA 16 axes directly drive continuous structural parameters.
 * The renderer builds geometry from these numbers.
 * Every unique DNA produces a unique body.
 *
 * Parameters are unbounded above — evolution level scales expression.
 * A creature with high verbal + empathy + stability will NATURALLY
 * produce an upright form with separated head and limbs.
 * A creature with high persistence + spatial will NATURALLY elongate.
 * We don't need to name these — the math does it.
 */

import type { CreatureDNA } from "./dna";

export type BodyStructure = {
  /** Vertical orientation: -1 = horizontal, 0 = neutral, 1 = fully upright */
  uprightness: number;
  /** Body elongation: 0.5 = compact sphere, 1 = normal, 3+ = serpentine */
  elongation: number;
  /** How flat/wide the body is: 0.5 = tall/thin, 1 = round, 2+ = flat/wide */
  flatness: number;
  /** Head separation from body: 0 = no distinct head, 1+ = fully separated head */
  headSeparation: number;
  /** Head size relative to body: 0.2 = tiny, 1 = same as body, 1.5+ = huge */
  headScale: number;
  /** Number of body segments: 1 = monolithic, 2-3 = segmented, 6+ = chain */
  segmentCount: number;
  /** Segment spacing: 0 = overlapping, 1 = touching, 2+ = spread apart */
  segmentSpacing: number;
  /** Limb count (continuous): 0 = none, 2 = biped, 4 = quad, 6+ = multi */
  limbCount: number;
  /** Limb length relative to body: 0 = stubs, 1 = body-length, 2+ = very long */
  limbLength: number;
  /** Limb thickness: 0 = wire-thin, 0.5 = normal, 1+ = chunky */
  limbThickness: number;
  /** Where limbs attach vertically: 0 = bottom only, 0.5 = middle, 1 = distributed */
  limbDistribution: number;
  /** Wing span: 0 = none, 1 = body-width, 3+ = huge */
  wingSpan: number;
  /** Wing position: 0 = low/back, 0.5 = mid, 1 = high/top */
  wingPosition: number;
  /** Tail length: 0 = none, 1 = body-length, 3+ = very long */
  tailLength: number;
  /** Tail thickness: 0 = whip-thin, 1 = chunky */
  tailThickness: number;
  /** Body fragmentation: 0 = solid, 1+ = pieces orbiting */
  fragmentation: number;
  /** Branch count (tree-like growths): 0 = none, 3+ = branching */
  branchCount: number;
  /** Branch length: 0 = stubs, 1+ = long */
  branchLength: number;
  /** Overall body scale */
  coreScale: number;
  /** Symmetry: 0 = asymmetric, 1 = bilateral */
  symmetry: number;
};

/**
 * Derive body structure directly from DNA. No categories.
 * Every parameter is a continuous function of DNA axes.
 */
export function deriveBodyStructure(dna: CreatureDNA, genLevel: number): BodyStructure {
  // Evolution scales expression range
  const evo = 0.3 + 0.7 * (1 - 1 / (1 + (genLevel - 1) * 0.2));
  const evoBonus = Math.max(0, (genLevel - 5) * 0.02);
  const expr = evo + evoBonus;

  // Each parameter is a direct function of DNA combinations.
  // No lookup tables, no categories — pure math.

  const uprightness = (
    dna.verbal * 0.3 + dna.empathy * 0.2 + dna.assertiveness * 0.2
    - dna.stability * 0.15 - dna.adaptability * 0.1
  ) * 2 * expr; // range roughly -0.5 to 1.5

  const elongation = (
    0.8
    + dna.persistence * 0.8
    + dna.spatial * 0.6
    - dna.stability * 0.3
  ) * expr;

  const flatness = (
    0.8
    + dna.adaptability * 0.5
    + dna.openness * 0.3
    - dna.assertiveness * 0.2
  );

  const headSeparation = (
    dna.verbal * 0.4 + dna.curiosity * 0.3 + dna.analytical * 0.2 - 0.2
  ) * expr;

  const headScale = (
    0.3
    + dna.verbal * 0.3
    + dna.curiosity * 0.2
    + dna.empathy * 0.15
  );

  const segmentCount = Math.max(1,
    1 + (dna.persistence * 2.5 + dna.analytical * 1.5 - 0.5) * expr,
  );

  const segmentSpacing = (
    0.8 + dna.independence * 0.5 + dna.openness * 0.3 - dna.warmth * 0.2
  );

  const limbCount = Math.max(0,
    (dna.assertiveness * 2.5 + dna.adaptability * 2 + dna.stability * 1.5 - 1.0) * expr,
  );

  const limbLength = Math.max(0,
    dna.spatial * 0.5 + dna.assertiveness * 0.3 + dna.persistence * 0.2
  ) * expr;

  const limbThickness = (
    0.2 + dna.stability * 0.4 + dna.warmth * 0.2 - dna.openness * 0.1
  );

  const limbDistribution = (
    dna.adaptability * 0.5 + dna.openness * 0.3 + dna.creativity * 0.2
  );

  const wingSpan = Math.max(0,
    (dna.openness * 0.6 + dna.independence * 0.4 + dna.adaptability * 0.3 - 0.5) * expr * 2,
  );

  const wingPosition = (
    0.3 + dna.openness * 0.3 + dna.creativity * 0.2
  );

  const tailLength = Math.max(0,
    (dna.playfulness * 0.5 + dna.adaptability * 0.3 + dna.persistence * 0.2 - 0.15) * expr,
  );

  const tailThickness = (
    0.2 + dna.warmth * 0.3 + dna.stability * 0.2
  );

  const fragmentation = Math.max(0,
    (dna.creativity * 0.4 + dna.independence * 0.4 - dna.stability * 0.3 - 0.2) * expr,
  );

  const branchCount = Math.max(0,
    (dna.creativity * 2 + dna.warmth * 1 + dna.openness * 1 - 1.5) * expr,
  );

  const branchLength = Math.max(0,
    dna.openness * 0.4 + dna.creativity * 0.3 + dna.persistence * 0.2 - 0.15,
  );

  const coreScale = 0.7 + dna.warmth * 0.2 + dna.stability * 0.15;

  const symmetry = (
    0.3 + dna.stability * 0.35 + dna.analytical * 0.2 - dna.creativity * 0.15
  );

  return {
    uprightness: Math.max(-1, uprightness),
    elongation: Math.max(0.5, elongation),
    flatness: Math.max(0.3, flatness),
    headSeparation: Math.max(0, headSeparation),
    headScale: Math.max(0.1, headScale),
    segmentCount,
    segmentSpacing: Math.max(0.3, segmentSpacing),
    limbCount,
    limbLength,
    limbThickness: Math.max(0.05, limbThickness),
    limbDistribution: Math.min(1, Math.max(0, limbDistribution)),
    wingSpan,
    wingPosition: Math.min(1, Math.max(0, wingPosition)),
    tailLength,
    tailThickness: Math.max(0.05, tailThickness),
    fragmentation,
    branchCount,
    branchLength,
    coreScale,
    symmetry: Math.min(1, Math.max(0, symmetry)),
  };
}
