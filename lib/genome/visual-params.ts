/**
 * DNA-to-Geometry Mapping Pipeline
 *
 * Converts the creature's 16-axis DNA vector directly into Three.js
 * Material, Geometry, and Scene parameters via explicit interpolation formulas.
 * No discrete archetype buckets — every unique DNA produces a unique visual signature.
 *
 * Mapping principles:
 *   warmth ↑      → softer surfaces, warm-toned ambient light, rounded displacement
 *   playfulness ↑ → surface noise, asymmetry factor, particle chaos, glitch intensity
 *   analytical ↑  → sharp edges, cool-toned key light, low roughness (smooth/metallic)
 *   creativity ↑  → saturation boost, structural complexity, hue variance
 *   intensity ↑   → emissive bloom, fast pulse frequency, high contrast
 *   stability ↑   → suppressed noise, slow morph speed, symmetric form
 *   independence ↑→ particle drift amplitude, reduced opacity (elusive presence)
 *   curiosity ↑   → particle speed, bright emissive, fast idle rotation
 *   empathy ↑     → warm secondary tones, soft outline weight
 *   openness ↑    → bloom spread, color spectrum width
 *   assertiveness ↑→ strong key light, body scale bias
 *   persistence ↑ → slow morph, dense surface, low particle chaos
 *   adaptability ↑→ fast morph speed, fluid outline
 *   intuitive ↑   → iridescence effect, shimmer intensity
 *   spatial ↑     → multi-axis displacement, geometry segment complexity
 *   verbal ↑      → particle count (words as visible energy)
 */

import type { CreatureDNA } from "./dna";

export type VisualParams = {
  // ── Material ──────────────────────────────────────────────────────────────
  /** 0 = glass-smooth, 1 = stone-rough */
  roughness: number;
  /** 0 = matte, 1 = chrome/mirror */
  metalness: number;
  /** Emissive glow multiplier applied on top of base intensity (0..1.5) */
  emissiveBoost: number;
  /** Body mesh opacity (0.4..0.98) */
  opacity: number;

  // ── Color modulation ──────────────────────────────────────────────────────
  /** Additional hue rotation in degrees (-35..+35); warm shifts positive */
  hueShift: number;
  /** Saturation multiplier (0.5..1.6); creativity drives vivid */
  saturationBoost: number;
  /** 0 = cool blue-toned, 1 = warm amber-toned (drives scene light color) */
  warmthBias: number;

  // ── Geometry surface ──────────────────────────────────────────────────────
  /** Vertex displacement smoothness factor (0..1); warmth+empathy raise this */
  surfaceSmoothness: number;
  /** Surface noise/glitch amplitude (0..0.3); playfulness+creativity raise this */
  noiseAmplitude: number;
  /** 0 = bilateral symmetry, 1 = highly asymmetric; playfulness+independence raise this */
  asymmetryFactor: number;
  /** Outline/edge thickness weight (0..1); analytical+assertiveness raise this */
  edgeSharpness: number;

  // ── Animation ─────────────────────────────────────────────────────────────
  /** Emissive pulse frequency in Hz (0.3..3.5); intensity+playfulness raise this */
  pulseFrequency: number;
  /** Vertex morph target lerp speed (0.05..1.0); adaptability+playfulness raise this */
  morphSpeed: number;

  // ── Scene ─────────────────────────────────────────────────────────────────
  /** Post-processing bloom intensity override (0.05..1.8) */
  bloomIntensity: number;
  /** RGB ambient light color [0..1 each], warmth-driven */
  ambientLightColor: { r: number; g: number; b: number };
  /** Key directional light intensity (0.4..1.8); intensity+assertiveness raise this */
  keyLightIntensity: number;

  // ── Particle system ───────────────────────────────────────────────────────
  /** Particle orbit speed multiplier (0.3..3.0) */
  particleSpeed: number;
  /** Particle size relative scale (0.3..1.8) */
  particleSize: number;
  /** Wobble/chaos amplitude for particle paths (0..1) */
  particleChaos: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Map 16 DNA axes to Three.js visual parameters via explicit linear interpolation.
 *
 * All formulas are documented inline so a reader can trace exactly how each
 * DNA axis contributes to each visual outcome.
 */
export function calculateVisualParams(dna: CreatureDNA): VisualParams {
  // ── Material roughness ────────────────────────────────────────────────────
  // warmth + empathy → organic skin-like roughness (felt, not glass)
  // analytical + spatial → precision surface (lower roughness = more reflective)
  // stability → settled, consistent texture
  const roughness = clamp(
    lerp(0.05, 0.72,
      dna.warmth * 0.38
      + dna.empathy * 0.18
      + (1 - dna.analytical) * 0.28
      + (1 - dna.spatial) * 0.10
      + dna.stability * 0.06
    ),
    0.04, 0.82,
  );

  // ── Metalness ─────────────────────────────────────────────────────────────
  // analytical + spatial → crystalline/mechanical sheen
  // warmth suppresses (organic materials aren't metallic)
  const metalness = clamp(
    dna.analytical * 0.38 + dna.spatial * 0.28 - dna.warmth * 0.14 - dna.empathy * 0.06,
    0, 0.92,
  );

  // ── Emissive boost ────────────────────────────────────────────────────────
  // intensity + openness → bright, glowing presence
  // creativity adds a chromatic shimmer contribution
  // stability dampens (stoic creatures don't blaze)
  const emissiveBoost = clamp(
    0.12
    + dna.intensity * 0.55
    + dna.openness * 0.28
    + dna.creativity * 0.18
    - dna.stability * 0.12,
    0.04, 1.5,
  );

  // ── Opacity ───────────────────────────────────────────────────────────────
  // stability + persistence → solid, grounded presence
  // openness + intuitive → ethereal transparency
  // independence → elusive, slightly see-through
  const opacity = clamp(
    0.58
    + dna.stability * 0.22
    + dna.persistence * 0.12
    - dna.openness * 0.14
    - dna.intuitive * 0.12
    - dna.independence * 0.08,
    0.38, 0.97,
  );

  // ── Hue shift ─────────────────────────────────────────────────────────────
  // warmth → toward warm (+red/orange); analytical → toward cool (-blue/teal)
  // creativity → toward purple/indigo; independence → toward green
  const hueShift = clamp(
    dna.warmth * 22
    - dna.analytical * 28
    + dna.creativity * 14
    + dna.independence * (-8),
    -35, 35,
  );

  // ── Saturation boost ──────────────────────────────────────────────────────
  // creativity + intensity → vivid, saturated colors
  // stability → neutral, desaturated palette
  const saturationBoost = clamp(
    0.72
    + dna.creativity * 0.42
    + dna.intensity * 0.22
    - dna.stability * 0.22,
    0.38, 1.65,
  );

  // ── Warmth bias (drives scene light color) ────────────────────────────────
  // warmth + empathy → amber/warm ambient; analytical → cool blue ambient
  const warmthBias = clamp(
    dna.warmth * 0.58 + dna.empathy * 0.22 + (1 - dna.analytical) * 0.20,
    0, 1,
  );

  // ── Surface smoothness ────────────────────────────────────────────────────
  // warmth + empathy → soft, rounded organic surface
  // assertiveness + analytical → crisp, hard-defined edges
  const surfaceSmoothness = clamp(
    dna.warmth * 0.40
    + dna.empathy * 0.28
    + (1 - dna.assertiveness) * 0.18
    + dna.stability * 0.14,
    0.04, 1.0,
  );

  // ── Noise amplitude (surface chaos / glitch) ─────────────────────────────
  // playfulness + creativity → unpredictable surface deformation, glitch aesthetic
  // stability → suppresses all noise
  // analytical → precision, no glitch
  const noiseAmplitude = clamp(
    dna.playfulness * 0.16
    + dna.creativity * 0.09
    + (1 - dna.stability) * 0.08
    - dna.analytical * 0.06,
    0.0, 0.30,
  );

  // ── Asymmetry factor ──────────────────────────────────────────────────────
  // playfulness → breaks bilateral symmetry (wonky, surprising shapes)
  // independence → idiosyncratic form that defies convention
  // stability + analytical → enforce symmetric regularity
  const asymmetryFactor = clamp(
    dna.playfulness * 0.42
    + dna.independence * 0.26
    + dna.creativity * 0.16
    - dna.stability * 0.32
    - dna.analytical * 0.22,
    0, 1.0,
  );

  // ── Edge sharpness ────────────────────────────────────────────────────────
  // analytical + assertiveness → sharp, defined outlines (cold precision)
  // warmth + empathy → soft, blurred edges (approachable form)
  const edgeSharpness = clamp(
    dna.analytical * 0.42
    + dna.assertiveness * 0.32
    + dna.intensity * 0.12
    - dna.warmth * 0.28
    - dna.empathy * 0.18,
    0, 1.0,
  );

  // ── Pulse frequency ───────────────────────────────────────────────────────
  // intensity + playfulness → rapid, erratic emissive pulsing
  // stability + persistence → slow, steady heartbeat rhythm
  const pulseFrequency = clamp(
    0.5
    + dna.intensity * 1.55
    + dna.playfulness * 0.82
    - dna.stability * 0.65
    - dna.persistence * 0.22,
    0.28, 3.5,
  );

  // ── Morph speed ───────────────────────────────────────────────────────────
  // adaptability + playfulness → fluid shape-shifting
  // persistence + stability → slow, deliberate transformation
  const morphSpeed = clamp(
    0.18
    + dna.adaptability * 0.52
    + dna.playfulness * 0.22
    - dna.persistence * 0.16
    - dna.stability * 0.12,
    0.04, 1.0,
  );

  // ── Bloom intensity ───────────────────────────────────────────────────────
  // openness + intensity + creativity → radiant glow aura
  // analytical → precise, no bleed (sharp and contained)
  const bloomIntensity = clamp(
    0.08
    + dna.openness * 0.52
    + dna.intensity * 0.38
    + dna.creativity * 0.22
    - dna.analytical * 0.12,
    0.04, 1.82,
  );

  // ── Ambient light color ───────────────────────────────────────────────────
  // warmthBias drives a smooth gradient from cool blue-gray to warm amber
  // Cool end: ~rgb(0.10, 0.12, 0.28) / Warm end: ~rgb(0.26, 0.22, 0.10)
  const ambientLightColor = {
    r: lerp(0.10, 0.26, warmthBias),
    g: lerp(0.12, 0.20, warmthBias * 0.65),
    b: lerp(0.28, 0.10, warmthBias),
  };

  // ── Key light intensity ───────────────────────────────────────────────────
  // intensity + assertiveness → dramatic, high-contrast key light
  // stability dampens (even, ambient-lit calm)
  const keyLightIntensity = clamp(
    0.62
    + dna.intensity * 0.52
    + dna.assertiveness * 0.32
    - dna.stability * 0.18,
    0.38, 1.82,
  );

  // ── Particle behavior ─────────────────────────────────────────────────────
  // speed: intensity + playfulness + curiosity → lively orbit
  const particleSpeed = clamp(
    0.5
    + dna.intensity * 0.82
    + dna.playfulness * 0.52
    + dna.curiosity * 0.32
    - dna.stability * 0.42,
    0.28, 3.0,
  );

  // size: warmth + empathy → large, visible particles (affectionate presence)
  // independence → small, sparse (distant particles)
  const particleSize = clamp(
    0.58
    + dna.warmth * 0.62
    + dna.empathy * 0.42
    - dna.independence * 0.32,
    0.28, 1.82,
  );

  // chaos: playfulness + creativity + independence → erratic particle paths
  // stability + persistence → smooth, regular orbit
  const particleChaos = clamp(
    dna.playfulness * 0.52
    + dna.creativity * 0.26
    + dna.independence * 0.18
    - dna.stability * 0.22
    - dna.persistence * 0.14,
    0, 1.0,
  );

  return {
    roughness,
    metalness,
    emissiveBoost,
    opacity,
    hueShift,
    saturationBoost,
    warmthBias,
    surfaceSmoothness,
    noiseAmplitude,
    asymmetryFactor,
    edgeSharpness,
    pulseFrequency,
    morphSpeed,
    bloomIntensity,
    ambientLightColor,
    keyLightIntensity,
    particleSpeed,
    particleSize,
    particleChaos,
  };
}
