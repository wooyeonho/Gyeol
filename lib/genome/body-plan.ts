/**
 * Body Plan System
 *
 * Derives a fundamental body architecture from DNA, determining the
 * creature's silhouette and structural layout. This is the highest-level
 * morphological decision — it determines whether a creature looks like
 * a blob, a snake, a biped, a quadruped, or something else entirely.
 *
 * Body plans are NOT discrete categories. Each plan has a continuous
 * "affinity" score derived from DNA. The dominant plan determines the
 * base structure, while secondary affinities blend in features.
 *
 * Body plans:
 * - amorphous:  classic blob/sphere (default, current behavior)
 * - serpentine: elongated chain of segments, snake/worm/dragon
 * - bipedal:   upright torso with head, 2 arms, 2 legs
 * - quadruped: horizontal body with head and 4 legs
 * - avian:     lightweight body with dominant wings
 * - aquatic:   streamlined/flat body with fins
 * - insectoid: multi-segmented body with many thin legs
 * - arboreal:  trunk-like body with branching limbs
 * - humanoid:  human-proportioned body (high empathy + verbal + warmth)
 * - composite: fragmented body — orbiting pieces, no single core
 */

import type { CreatureDNA } from "./dna";

export const BODY_PLAN_KEYS = [
  "amorphous", "serpentine", "bipedal", "quadruped",
  "avian", "aquatic", "insectoid", "arboreal",
  "humanoid", "composite",
] as const;

export type BodyPlanKey = (typeof BODY_PLAN_KEYS)[number];

export type BodyPlanAffinities = Record<BodyPlanKey, number>;

export type BodyPlanConfig = {
  /** Primary body plan */
  primary: BodyPlanKey;
  /** How strongly this creature matches its primary plan (0..1+) */
  primaryStrength: number;
  /** Secondary body plan for blending */
  secondary: BodyPlanKey;
  /** Secondary blend weight (0..1) */
  secondaryWeight: number;
  /** All affinities for fine-grained blending */
  affinities: BodyPlanAffinities;
  /** Structural parameters derived from DNA + body plan */
  structure: BodyStructure;
};

export type BodyStructure = {
  /** Number of major body parts (1 = monolithic, 2+ = segmented/multi-part) */
  partCount: number;
  /** Vertical orientation: -1 = horizontal (quadruped), 0 = neutral, 1 = upright (biped) */
  uprightness: number;
  /** How spread out the body is: 0 = compact, 1 = dispersed */
  dispersion: number;
  /** Limb length relative to body: 0 = no limbs, 1+ = long limbs */
  limbLength: number;
  /** Limb thickness: 0 = thin/spindly, 1 = thick/chunky */
  limbThickness: number;
  /** Head size relative to body: 0 = no distinct head, 1 = large head */
  headProminence: number;
  /** Body aspect ratio: <1 = wide/flat, 1 = round, >1 = tall/long */
  aspectRatio: number;
  /** Core body scale multiplier */
  coreScale: number;
  /** Wing span (0 = none, 1+ = large wings) */
  wingSpan: number;
  /** Tail length (0 = none, 1+ = long tail) */
  tailLength: number;
  /** Branch count for arboreal (0 = none) */
  branchCount: number;
  /** Fragment count for composite (0 = none) */
  fragmentCount: number;
};

/**
 * Derive body plan configuration from DNA.
 * Deterministic: same DNA always produces the same body plan.
 */
export function deriveBodyPlan(dna: CreatureDNA, genLevel: number): BodyPlanConfig {
  const evo = Math.min(1, 0.3 + genLevel * 0.1);

  const affinities = computeBodyPlanAffinities(dna);

  // Sort by affinity to find primary and secondary
  const sorted = BODY_PLAN_KEYS
    .map((key) => ({ key, score: affinities[key] }))
    .sort((a, b) => b.score - a.score);

  const primary = sorted[0].key;
  const primaryStrength = sorted[0].score;
  const secondary = sorted[1].key;
  const totalTop2 = sorted[0].score + sorted[1].score;
  const secondaryWeight = totalTop2 > 0
    ? (sorted[1].score / totalTop2) * evo
    : 0;

  const structure = deriveStructure(dna, primary, secondaryWeight, secondary, evo);

  return {
    primary,
    primaryStrength,
    secondary,
    secondaryWeight,
    affinities,
    structure,
  };
}

/**
 * Compute how much the DNA "wants" each body plan.
 * Each plan has a resonance function based on DNA axis combinations.
 */
function computeBodyPlanAffinities(dna: CreatureDNA): BodyPlanAffinities {
  // Amorphous: default, favored by balanced/low-extreme DNA
  const extremity = computeExtremity(dna);
  const amorphous = 0.4 - extremity * 0.3 + dna.adaptability * 0.2;

  // Serpentine: persistence + spatial + low stability → long winding body
  const serpentine = dna.persistence * 0.3 + dna.spatial * 0.25
    + dna.adaptability * 0.2 - dna.stability * 0.15;

  // Bipedal: verbal + assertiveness + empathy → upright communicator
  const bipedal = dna.verbal * 0.3 + dna.assertiveness * 0.25
    + dna.empathy * 0.15 - dna.independence * 0.1;

  // Quadruped: stability + warmth + persistence → grounded creature
  const quadruped = dna.stability * 0.3 + dna.warmth * 0.2
    + dna.persistence * 0.2 - dna.verbal * 0.1;

  // Avian: openness + independence + adaptability → flying creature
  const avian = dna.openness * 0.3 + dna.independence * 0.25
    + dna.adaptability * 0.2 - dna.stability * 0.15;

  // Aquatic: adaptability + intuitive + playfulness → fluid swimmer
  const aquatic = dna.adaptability * 0.25 + dna.intuitive * 0.25
    + dna.playfulness * 0.2 - dna.assertiveness * 0.1;

  // Insectoid: analytical + persistence + spatial → multi-part precision
  const insectoid = dna.analytical * 0.3 + dna.persistence * 0.2
    + dna.spatial * 0.2 - dna.warmth * 0.15;

  // Arboreal: creativity + warmth + openness → branching growth
  const arboreal = dna.creativity * 0.3 + dna.warmth * 0.2
    + dna.openness * 0.2 - dna.assertiveness * 0.1;

  // Humanoid: empathy + verbal + warmth + intuitive → most human-like
  const humanoid = dna.empathy * 0.25 + dna.verbal * 0.25
    + dna.warmth * 0.2 + dna.intuitive * 0.15 - dna.independence * 0.15;

  // Composite: creativity + independence + intensity → fragmented being
  const composite = dna.creativity * 0.25 + dna.independence * 0.25
    + dna.intensity * 0.2 - dna.stability * 0.15;

  return {
    amorphous: Math.max(0, amorphous),
    serpentine: Math.max(0, serpentine),
    bipedal: Math.max(0, bipedal),
    quadruped: Math.max(0, quadruped),
    avian: Math.max(0, avian),
    aquatic: Math.max(0, aquatic),
    insectoid: Math.max(0, insectoid),
    arboreal: Math.max(0, arboreal),
    humanoid: Math.max(0, humanoid),
    composite: Math.max(0, composite),
  };
}

/** Measure how extreme (non-centered) the DNA values are overall. */
function computeExtremity(dna: CreatureDNA): number {
  const axes = [
    dna.analytical, dna.intuitive, dna.verbal, dna.spatial,
    dna.warmth, dna.intensity, dna.stability, dna.openness,
    dna.assertiveness, dna.empathy, dna.playfulness, dna.independence,
    dna.curiosity, dna.persistence, dna.adaptability, dna.creativity,
  ];
  let sum = 0;
  for (const v of axes) {
    sum += Math.abs(v - 0.5) * 2; // 0 at center, 1 at extremes
  }
  return sum / axes.length;
}

/** Derive structural parameters for the body plan. */
function deriveStructure(
  dna: CreatureDNA,
  primary: BodyPlanKey,
  secondaryWeight: number,
  secondary: BodyPlanKey,
  evo: number,
): BodyStructure {
  // Base structure from primary plan
  const base = getBaseStructure(primary, dna, evo);

  // Blend in secondary plan
  if (secondaryWeight > 0.1) {
    const sec = getBaseStructure(secondary, dna, evo);
    const w = secondaryWeight;
    base.partCount = Math.round(base.partCount * (1 - w) + sec.partCount * w);
    base.uprightness = base.uprightness * (1 - w) + sec.uprightness * w;
    base.dispersion = base.dispersion * (1 - w) + sec.dispersion * w;
    base.limbLength = base.limbLength * (1 - w) + sec.limbLength * w;
    base.limbThickness = base.limbThickness * (1 - w) + sec.limbThickness * w;
    base.headProminence = base.headProminence * (1 - w) + sec.headProminence * w;
    base.aspectRatio = base.aspectRatio * (1 - w) + sec.aspectRatio * w;
    base.wingSpan = base.wingSpan * (1 - w) + sec.wingSpan * w;
    base.tailLength = base.tailLength * (1 - w) + sec.tailLength * w;
    base.branchCount = Math.round(base.branchCount * (1 - w) + sec.branchCount * w);
    base.fragmentCount = Math.round(base.fragmentCount * (1 - w) + sec.fragmentCount * w);
  }

  return base;
}

function getBaseStructure(plan: BodyPlanKey, dna: CreatureDNA, evo: number): BodyStructure {
  switch (plan) {
    case "amorphous":
      return {
        partCount: 1,
        uprightness: 0,
        dispersion: 0,
        limbLength: 0,
        limbThickness: 0,
        headProminence: 0.2,
        aspectRatio: 0.8 + dna.spatial * 0.4,
        coreScale: 1.0,
        wingSpan: 0,
        tailLength: dna.playfulness * 0.3,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "serpentine":
      return {
        partCount: Math.round(4 + dna.persistence * 6 * evo),
        uprightness: -0.3 + dna.assertiveness * 0.6,
        dispersion: 0.1,
        limbLength: dna.assertiveness * 0.3 * evo,
        limbThickness: 0.15,
        headProminence: 0.5 + dna.verbal * 0.3,
        aspectRatio: 2.5 + dna.spatial * 2.0,
        coreScale: 0.7,
        wingSpan: dna.openness * 0.4 * evo,
        tailLength: 0.8 + dna.adaptability * 0.5,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "bipedal":
      return {
        partCount: 3, // head + torso + lower
        uprightness: 0.9,
        dispersion: 0.2,
        limbLength: 0.6 + dna.assertiveness * 0.4,
        limbThickness: 0.3 + dna.stability * 0.3,
        headProminence: 0.6 + dna.verbal * 0.3,
        aspectRatio: 1.8 + dna.spatial * 0.4,
        coreScale: 0.8,
        wingSpan: dna.openness > 0.7 ? (dna.openness - 0.7) * 2 * evo : 0,
        tailLength: dna.playfulness * 0.5,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "quadruped":
      return {
        partCount: 2, // head + body
        uprightness: -0.6,
        dispersion: 0.15,
        limbLength: 0.5 + dna.persistence * 0.3,
        limbThickness: 0.4 + dna.stability * 0.3,
        headProminence: 0.5 + dna.warmth * 0.3,
        aspectRatio: 1.3 + dna.spatial * 0.3,
        coreScale: 0.9,
        wingSpan: 0,
        tailLength: 0.5 + dna.playfulness * 0.5,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "avian":
      return {
        partCount: 2,
        uprightness: 0.3,
        dispersion: 0.3,
        limbLength: 0.3 + dna.adaptability * 0.2,
        limbThickness: 0.15,
        headProminence: 0.4 + dna.curiosity * 0.2,
        aspectRatio: 1.0,
        coreScale: 0.6,
        wingSpan: 1.0 + dna.openness * 1.0 + dna.independence * 0.5,
        tailLength: 0.3 + dna.playfulness * 0.5,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "aquatic":
      return {
        partCount: 1,
        uprightness: -0.8,
        dispersion: 0.05,
        limbLength: 0,
        limbThickness: 0,
        headProminence: 0.3,
        aspectRatio: 0.5 + dna.adaptability * 0.3, // flat
        coreScale: 1.1,
        wingSpan: 0,
        tailLength: 0.6 + dna.adaptability * 0.4,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "insectoid":
      return {
        partCount: Math.round(3 + dna.analytical * 3 * evo),
        uprightness: -0.3,
        dispersion: 0.2,
        limbLength: 0.7 + dna.spatial * 0.5,
        limbThickness: 0.1 + dna.persistence * 0.1,
        headProminence: 0.4 + dna.curiosity * 0.3,
        aspectRatio: 1.5 + dna.persistence * 0.5,
        coreScale: 0.5,
        wingSpan: dna.adaptability > 0.5 ? (dna.adaptability - 0.5) * 1.5 * evo : 0,
        tailLength: dna.assertiveness * 0.4,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "arboreal":
      return {
        partCount: 1,
        uprightness: 0.7,
        dispersion: 0.4 + dna.creativity * 0.3,
        limbLength: 0.3 + dna.openness * 0.5,
        limbThickness: 0.5 + dna.stability * 0.3,
        headProminence: 0.2,
        aspectRatio: 1.8 + dna.persistence * 0.8,
        coreScale: 0.7,
        wingSpan: 0,
        tailLength: 0,
        branchCount: Math.round(3 + dna.creativity * 5 * evo),
        fragmentCount: 0,
      };

    case "humanoid":
      return {
        partCount: 4, // head + torso + arms + legs
        uprightness: 1.0,
        dispersion: 0.15,
        limbLength: 0.7 + dna.spatial * 0.3,
        limbThickness: 0.35 + dna.stability * 0.2,
        headProminence: 0.7 + dna.verbal * 0.2,
        aspectRatio: 2.2 + dna.spatial * 0.3,
        coreScale: 0.75,
        wingSpan: dna.creativity > 0.8 ? (dna.creativity - 0.8) * 3 * evo : 0,
        tailLength: 0,
        branchCount: 0,
        fragmentCount: 0,
      };

    case "composite":
      return {
        partCount: Math.round(3 + dna.creativity * 4 * evo),
        uprightness: 0,
        dispersion: 0.6 + dna.independence * 0.4,
        limbLength: 0,
        limbThickness: 0,
        headProminence: 0.3,
        aspectRatio: 1.0,
        coreScale: 0.5,
        wingSpan: 0,
        tailLength: 0,
        branchCount: 0,
        fragmentCount: Math.round(3 + dna.independence * 5 * evo),
      };
  }
}
