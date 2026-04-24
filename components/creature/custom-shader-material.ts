/**
 * DNA-driven MeshPhysicalMaterial — Fresnel, Iridescence, Sheen (SSS approx).
 *
 * DNA → Material mapping:
 *   intuitive + creativity → iridescence (prismatic rainbow shimmer)
 *   warmth + empathy       → sheen (velvet/skin subsurface approximation)
 *   analytical + independence → ior (Fresnel glass edge glow)
 *   openness               → transmission (subtle glass transparency)
 *
 * All effects run entirely on the client GPU via Three.js MeshPhysicalMaterial.
 * Frame-rate-independent easing via maath/easing damp().
 * Never call needsUpdate = true here — value changes are uniform updates only.
 */

import * as THREE from "three";
import { damp } from "maath/easing";
import { calculateVisualParams } from "@/lib/genome/visual-params";
import type { CreatureDNA } from "@/lib/genome/dna";

export type DNAMaterialTargets = {
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessMax: number;
  sheen: number;
  sheenRoughness: number;
  sheenColorR: number;
  sheenColorG: number;
  sheenColorB: number;
  transmission: number;
  ior: number;
  roughness: number;
  metalness: number;
};

// Smooth easing speed — slow enough to be visually perceptible as a morph
const LAMBDA = 2.0;

// Minimum non-zero values prevent shader variant flipping (0 ↔ non-zero triggers recompile)
const EPS = 0.005;

/**
 * Compute target material properties from 16-axis DNA.
 * All values are clamped to non-zero minimums to keep the compiled shader
 * variant stable across DNA mutations.
 */
export function computeDNAMaterialTargets(dna: CreatureDNA): DNAMaterialTargets {
  const vp = calculateVisualParams(dna);

  // Iridescence: intuitive drives rainbow angle; creativity drives spectral width
  const iridescence = Math.max(EPS, dna.intuitive * 0.65 + dna.creativity * 0.35);
  const iridescenceIOR = 1.3 + dna.intuitive * 1.1; // 1.3 → 2.4
  const iridescenceThicknessMax = 200 + dna.creativity * 400; // 200 → 600 nm

  // Sheen: warmth + empathy → velvet highlight (approximate SSS for organic skin)
  const sheen = Math.max(EPS, dna.warmth * 0.7 + dna.empathy * 0.3);
  const sheenRoughness = Math.max(0.15, 1 - dna.warmth * 0.7);
  // Warm creatures: amber/peach sheen; cool creatures: icy blue sheen
  const wb = dna.warmth * 0.7 + dna.empathy * 0.3;
  const sheenColorR = 1.0 * wb + 0.55 * (1 - wb);
  const sheenColorG = 0.72 * wb + 0.72 * (1 - wb);
  const sheenColorB = 0.52 * wb + 1.0 * (1 - wb);

  // Transmission: openness → glass-like translucency (capped to preserve body read)
  const transmission = Math.max(EPS, dna.openness * 0.2);

  // IOR: analytical + independence → Fresnel glass edge (higher = more refractive)
  const ior = 1.4 + dna.analytical * 0.7 + dna.independence * 0.4; // 1.4 → 2.5

  return {
    iridescence,
    iridescenceIOR,
    iridescenceThicknessMax,
    sheen,
    sheenRoughness,
    sheenColorR,
    sheenColorG,
    sheenColorB,
    transmission,
    ior,
    roughness: vp.roughness,
    metalness: vp.metalness,
  };
}

/**
 * Create a MeshPhysicalMaterial pre-initialized from DNA.
 * Initialises all DNA-driven properties to non-zero so that the compiled
 * shader variant (iridescence/sheen/transmission) never changes after creation.
 */
export function createDNAMaterial(
  dna: CreatureDNA,
  color: THREE.Color,
): THREE.MeshPhysicalMaterial {
  const t = computeDNAMaterialTargets(dna);
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0,
    roughness: t.roughness,
    metalness: t.metalness,
    iridescence: t.iridescence,
    iridescenceIOR: t.iridescenceIOR,
    iridescenceThicknessRange: [100, t.iridescenceThicknessMax],
    sheen: t.sheen,
    sheenRoughness: t.sheenRoughness,
    sheenColor: new THREE.Color(t.sheenColorR, t.sheenColorG, t.sheenColorB),
    transmission: t.transmission,
    ior: t.ior,
    envMapIntensity: 0.0, // no env map in scene — prevents dark artifact
    transparent: true,
  });
}

/**
 * Frame-rate-independent easing of all DNA-driven material properties.
 * Call every frame from useFrame(). No needsUpdate required — all changes
 * are uniform-level updates that Three.js handles automatically.
 */
export function dampDNAMaterial(
  mat: THREE.MeshPhysicalMaterial,
  targets: DNAMaterialTargets,
  dt: number,
): void {
  // @types/three@0.183 mistypes iridescence as boolean on the class instance;
  // it is a 0-1 float at runtime. Use any to bypass the broken declaration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = mat as any;
  m.iridescence    = damp(m.iridescence,    targets.iridescence,    LAMBDA, dt);
  m.iridescenceIOR = damp(m.iridescenceIOR, targets.iridescenceIOR, LAMBDA, dt);
  m.sheen          = damp(m.sheen,          targets.sheen,          LAMBDA, dt);
  m.sheenRoughness = damp(m.sheenRoughness, targets.sheenRoughness, LAMBDA, dt);
  m.transmission   = damp(m.transmission,   targets.transmission,   LAMBDA, dt);
  m.ior            = damp(m.ior,            targets.ior,            LAMBDA, dt);
  m.roughness      = damp(m.roughness,      targets.roughness,      LAMBDA, dt);
  m.metalness      = damp(m.metalness,      targets.metalness,      LAMBDA, dt);
  m.sheenColor.r   = damp(m.sheenColor.r,   targets.sheenColorR,    LAMBDA, dt);
  m.sheenColor.g   = damp(m.sheenColor.g,   targets.sheenColorG,    LAMBDA, dt);
  m.sheenColor.b   = damp(m.sheenColor.b,   targets.sheenColorB,    LAMBDA, dt);

  const range = mat.iridescenceThicknessRange as number[];
  range[1] = damp(range[1], targets.iridescenceThicknessMax, LAMBDA, dt);
}
