/**
 * DNA-Driven Morph Target System
 *
 * Generates procedural morph target definitions from the creature's DNA.
 * These morphs deform the base sphere/icosahedron mesh to create unique
 * body shapes — no two creatures look the same because morphs are
 * continuous functions of the 16-dimensional DNA vector.
 *
 * Morph targets:
 * - bodyStretch:   elongate/compress (verbal, spatial → tall; stability → squat)
 * - bodyBulge:     roundness/angularity (warmth → round; analytical → angular)
 * - crownGrowth:   top protrusion (creativity, intuitive → tall crown)
 * - sideSpread:    lateral extensions (assertiveness, independence → wide)
 * - rhythmWobble:  organic asymmetry (playfulness, adaptability → wobbly)
 * - crystalFacet:  hard-edge faceting (analytical, stability → crystalline)
 * - veilDrape:     flowing tendrils (openness, empathy → draped)
 * - coreConcentrate: density/size pulse (intensity, persistence → compact)
 */

import type { CreatureDNA } from "./dna";
import type { SpeciesProfile } from "./species";
import { getEvolutionCapacity } from "./continuous-morphology";

export type MorphWeights = {
  bodyStretch: number;
  bodyBulge: number;
  crownGrowth: number;
  sideSpread: number;
  rhythmWobble: number;
  crystalFacet: number;
  veilDrape: number;
  coreConcentrate: number;
};

/**
 * Derive morph target weights from DNA.
 * Each weight is 0..1, representing how much that morph should be applied.
 */
export function deriveMorphWeights(
  dna: CreatureDNA,
  species: SpeciesProfile,
  /** Optional gen level for evolution-capacity scaling (default 1) */
  genLevel?: number,
): MorphWeights {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const evo = getEvolutionCapacity(genLevel ?? 1);
  // morphComplexity scales how strongly morphs express (0.2 at Gen 1, ~1.0 at Gen 8+)
  const mc = evo.morphComplexity;

  // Archetype modifiers push certain morphs
  const archMod = ARCHETYPE_MORPH_BIAS[species.archetype] ?? {};

  // Each morph weight is scaled by morphComplexity — early gens express subtly,
  // later gens express the full range of deformation.
  return {
    bodyStretch: clamp01(
      ((dna.verbal * 0.4 + dna.spatial * 0.3 - dna.stability * 0.2 + 0.1) + (archMod.bodyStretch ?? 0)) * mc
    ),
    bodyBulge: clamp01(
      ((dna.warmth * 0.4 + dna.empathy * 0.25 - dna.analytical * 0.15 + 0.1) + (archMod.bodyBulge ?? 0)) * mc
    ),
    crownGrowth: clamp01(
      ((dna.creativity * 0.35 + dna.intuitive * 0.3 + dna.curiosity * 0.15 - 0.15) + (archMod.crownGrowth ?? 0)) * mc
    ),
    sideSpread: clamp01(
      ((dna.assertiveness * 0.35 + dna.independence * 0.25 + dna.intensity * 0.15 - 0.1) + (archMod.sideSpread ?? 0)) * mc
    ),
    rhythmWobble: clamp01(
      ((dna.playfulness * 0.4 + dna.adaptability * 0.3 - dna.stability * 0.2) + (archMod.rhythmWobble ?? 0)) * mc
    ),
    crystalFacet: clamp01(
      ((dna.analytical * 0.4 + dna.stability * 0.3 - dna.creativity * 0.15 - 0.1) + (archMod.crystalFacet ?? 0)) * mc
    ),
    veilDrape: clamp01(
      ((dna.openness * 0.35 + dna.empathy * 0.25 + dna.intuitive * 0.15 - 0.15) + (archMod.veilDrape ?? 0)) * mc
    ),
    coreConcentrate: clamp01(
      ((dna.intensity * 0.35 + dna.persistence * 0.3 - dna.openness * 0.15) + (archMod.coreConcentrate ?? 0)) * mc
    ),
  };
}

const ARCHETYPE_MORPH_BIAS: Partial<Record<SpeciesProfile["archetype"], Partial<MorphWeights>>> = {
  ethereal: { veilDrape: 0.2, crownGrowth: 0.15, crystalFacet: -0.15 },
  crystalline: { crystalFacet: 0.3, bodyBulge: -0.1, rhythmWobble: -0.2 },
  organic: { bodyBulge: 0.2, rhythmWobble: 0.1, crystalFacet: -0.15 },
  mechanical: { crystalFacet: 0.2, sideSpread: 0.15, bodyBulge: -0.1 },
  fluid: { rhythmWobble: 0.2, veilDrape: 0.15, crystalFacet: -0.2 },
  volcanic: { coreConcentrate: 0.25, sideSpread: 0.15, veilDrape: -0.1 },
  spectral: { veilDrape: 0.25, coreConcentrate: -0.1, bodyBulge: -0.15 },
  verdant: { crownGrowth: 0.25, bodyBulge: 0.1, crystalFacet: -0.1 },
};

/**
 * Generate vertex displacement vectors for a sphere geometry based on morph weights.
 * Returns an array of {x,y,z} offsets for each vertex in a unit sphere.
 *
 * This is the core function used by Three.js to create morph targets.
 * The displacement functions are designed to be smooth and organic.
 */
export function computeVertexDisplacements(
  positions: Float32Array,
  morphs: MorphWeights
): Float32Array {
  const count = positions.length / 3;
  const displacements = new Float32Array(positions.length);

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    // Normalize position to unit sphere
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    let dx = 0, dy = 0, dz = 0;

    // bodyStretch: elongate along Y axis
    if (morphs.bodyStretch > 0.01) {
      const factor = morphs.bodyStretch * 0.4;
      dy += ny * factor * (0.5 + Math.abs(ny) * 0.5);
    }

    // bodyBulge: inflate equator, compress poles
    if (morphs.bodyBulge > 0.01) {
      const equatorFactor = 1 - ny * ny; // max at equator
      const factor = morphs.bodyBulge * 0.3;
      dx += nx * equatorFactor * factor;
      dz += nz * equatorFactor * factor;
    }

    // crownGrowth: protrude upward from top hemisphere
    if (morphs.crownGrowth > 0.01) {
      const topFactor = Math.max(0, ny) ** 2;
      const factor = morphs.crownGrowth * 0.5;
      dy += topFactor * factor;
      // Slight inward pull at base of crown for organic look
      dx -= nx * topFactor * factor * 0.15;
      dz -= nz * topFactor * factor * 0.15;
    }

    // sideSpread: extend laterally
    if (morphs.sideSpread > 0.01) {
      const sideFactor = (1 - ny * ny) * (nx * nx > nz * nz ? 1 : 0.4);
      const factor = morphs.sideSpread * 0.35;
      dx += nx * sideFactor * factor;
    }

    // rhythmWobble: asymmetric organic deformation using sin waves
    if (morphs.rhythmWobble > 0.01) {
      const factor = morphs.rhythmWobble * 0.2;
      const wave1 = Math.sin(ny * 3.14 + nx * 2.7) * factor;
      const wave2 = Math.cos(nz * 2.1 + ny * 1.8) * factor * 0.7;
      dx += wave1;
      dy += wave2;
      dz += Math.sin(nx * 1.9 + nz * 2.3) * factor * 0.5;
    }

    // crystalFacet: push vertices along normals with quantized direction
    if (morphs.crystalFacet > 0.01) {
      const factor = morphs.crystalFacet * 0.15;
      // Quantize normal to create faceted look
      const qx = Math.round(nx * 3) / 3;
      const qy = Math.round(ny * 3) / 3;
      const qz = Math.round(nz * 3) / 3;
      dx += (qx - nx) * factor;
      dy += (qy - ny) * factor;
      dz += (qz - nz) * factor;
    }

    // veilDrape: downward flowing displacement in lower hemisphere
    if (morphs.veilDrape > 0.01) {
      const drapeFactor = Math.max(0, -ny) ** 1.5; // stronger at bottom
      const factor = morphs.veilDrape * 0.4;
      dy -= drapeFactor * factor;
      // Slight outward spread at bottom
      dx += nx * drapeFactor * factor * 0.3;
      dz += nz * drapeFactor * factor * 0.3;
    }

    // coreConcentrate: pull everything slightly inward (compact core)
    if (morphs.coreConcentrate > 0.01) {
      const factor = morphs.coreConcentrate * -0.15;
      dx += nx * factor;
      dy += ny * factor;
      dz += nz * factor;
    }

    displacements[i * 3] = dx;
    displacements[i * 3 + 1] = dy;
    displacements[i * 3 + 2] = dz;
  }

  return displacements;
}
