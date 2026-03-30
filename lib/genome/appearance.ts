/**
 * DNA-Driven Appearance System
 *
 * Derives unique visual properties from the creature's DNA.
 * Unlike the template-based appearance system, this creates
 * a continuous visual space where no two creatures look the same.
 */

import type { CreatureDNA } from "./dna";
import type { SpeciesProfile } from "./species";
import type { ArchetypeBlend } from "./continuous-morphology";
import { getEvolutionCapacity } from "./continuous-morphology";

export type DNAAppearance = {
  /** Primary color in HSL */
  primaryHue: number;
  primarySaturation: number;
  primaryLightness: number;
  /** Secondary color offset from primary */
  secondaryHueShift: number;
  /** Eye color derived from emotional DNA */
  eyeHue: number;
  /** Body proportions */
  bodyRatio: number; // 0 = compact, 1 = elongated
  bodySymmetry: number; // 0 = amorphous, 1 = perfect symmetry
  /** Surface texture */
  roughness: number; // 0 = smooth glass, 1 = rough stone
  metalness: number; // 0 = matte, 1 = mirror
  /** Glow properties */
  glowIntensity: number;
  glowPulseSpeed: number;
  /** Particle system */
  particleCount: number;
  particleDrift: number; // how far particles float
  particleSize: number;
  /** Animation */
  breatheDepth: number;
  breatheSpeed: number;
  idleRotation: number;
  /** Unique markings: a deterministic pattern seed */
  markingsSeed: number;
  /** Overall size modifier */
  scale: number;
};

/**
 * Derive unique appearance from DNA and species archetype.
 * The same DNA always produces the same appearance (deterministic).
 */
export function deriveDNAAppearance(
  dna: CreatureDNA,
  species: SpeciesProfile,
  /** Optional gen level for evolution-capacity scaling (default 1) */
  genLevel?: number,
): DNAAppearance {
  const evo = getEvolutionCapacity(genLevel ?? 1);
  // Primary color: weighted mix of all DNA dimensions
  // This creates a continuous color space — no two DNA profiles produce the same color
  const primaryHue =
    (dna.warmth * 30 +       // warm → warm hues
    dna.analytical * 220 +    // analytical → blue
    dna.creativity * 280 +    // creative → purple
    dna.intensity * 15 +      // intense → red
    dna.openness * 160 +      // open → cyan
    dna.empathy * 340 +       // empathic → pink
    dna.independence * 120 +  // independent → green
    dna.intuitive * 260       // intuitive → indigo
    ) / 8;

  const saturation = 62 + dna.intensity * 22 + dna.playfulness * 10;
  const lightness = 48 + dna.warmth * 14 + dna.openness * 10 - dna.independence * 6;

  const secondaryHueShift = 30 + dna.creativity * 60 - dna.stability * 20;

  // Eye color: continuous weighted blend of emotional DNA axes — no discrete thresholds.
  // Each axis pulls toward its characteristic hue proportionally to its strength.
  const eyeHue = (
    dna.empathy * 340 +    // empathy → pink
    dna.intensity * 30 +   // intensity → amber
    dna.curiosity * 190 +  // curiosity → cyan
    dna.stability * 140 +  // stability → green
    dna.warmth * 20 +      // warmth → warm gold
    dna.creativity * 280 + // creativity → purple
    dna.openness * 200     // openness → teal
  ) / (dna.empathy + dna.intensity + dna.curiosity + dna.stability + dna.warmth + dna.creativity + dna.openness + 0.001);

  // Body shape from cognitive/structural DNA
  const bodyRatio = 0.3 + dna.verbal * 0.3 + dna.spatial * 0.2 - dna.stability * 0.15;
  const bodySymmetry = 0.3 + dna.stability * 0.3 + dna.analytical * 0.25 - dna.creativity * 0.15;

  // Surface from DNA
  const roughness = 0.1 + (1 - dna.stability) * 0.4 + dna.assertiveness * 0.2;
  const metalness = dna.analytical * 0.3 + dna.spatial * 0.2;

  // Archetype glow modifier — continuous blend instead of discrete switch
  // Uses archetypeBlend when available, falls back to dominant archetype
  const blend: ArchetypeBlend | undefined = species.archetypeBlend;
  const archetypeGlowMod = blend
    ? 1.0
      + blend.ethereal * 0.3
      + blend.crystalline * 0.1
      + blend.volcanic * 0.4
      + blend.spectral * 0.2
    : (species.archetype === "ethereal" ? 1.3 :
       species.archetype === "crystalline" ? 1.1 :
       species.archetype === "volcanic" ? 1.4 :
       species.archetype === "spectral" ? 1.2 : 1.0);

  const glowIntensity = (0.45 + dna.openness * 0.25 + dna.creativity * 0.2) * archetypeGlowMod
    * (0.85 + evo.dnaExpressionRange * 0.15); // evolution capacity boosts glow
  const glowPulseSpeed = 0.5 + dna.intensity * 0.8 + dna.playfulness * 0.4;

  // Particles — more generous counts for a lively feel, scaled by evolution
  const particleCount = Math.round((14 + dna.creativity * 22 + dna.openness * 14) * (0.7 + evo.morphComplexity * 0.3));
  const particleDrift = 0.35 + dna.independence * 0.4 + dna.openness * 0.3;
  const particleSize = 0.012 + dna.warmth * 0.022 + dna.empathy * 0.016;

  // Animation — breathe depth deepens with evolution
  const breatheDepth = (0.02 + dna.stability * 0.03 + dna.warmth * 0.02) * (0.9 + evo.dnaExpressionRange * 0.1);
  const breatheSpeed = 0.8 + dna.playfulness * 0.6 - dna.stability * 0.3;
  const idleRotation = dna.curiosity * 0.3 + dna.playfulness * 0.2;

  // Deterministic markings seed from DNA hash
  let markingsSeed = 0;
  const axes = Object.values(dna) as number[];
  for (let i = 0; i < axes.length; i++) {
    markingsSeed = ((markingsSeed << 5) - markingsSeed + Math.round(axes[i] * 1000)) | 0;
  }

  // Scale from gen-level would be applied externally, base from DNA
  const scale = 0.85 + dna.assertiveness * 0.15 + dna.persistence * 0.1;

  // ── Open ranges: no artificial ceiling on expression ──
  // Only enforce physical minimums (no negative opacity, etc.)
  // DNA + evolution capacity determine the actual range — not developer clamps.
  return {
    primaryHue: primaryHue % 360,
    primarySaturation: Math.max(0, saturation),
    primaryLightness: clamp(lightness, 10, 95),
    secondaryHueShift: secondaryHueShift, // no clamp — can be any offset
    eyeHue: eyeHue % 360,
    bodyRatio: Math.max(0, bodyRatio), // no upper bound — can be very elongated
    bodySymmetry: Math.max(0, bodySymmetry), // no upper bound
    roughness: Math.max(0, roughness), // no upper bound — extreme textures allowed
    metalness: Math.max(0, metalness), // no upper bound — full chrome allowed
    glowIntensity: Math.max(0, glowIntensity), // no cap — high-gen creatures can blaze
    glowPulseSpeed: Math.max(0.1, glowPulseSpeed), // only prevent 0 (division risk)
    particleCount: Math.max(0, particleCount), // no upper cap
    particleDrift: Math.max(0, particleDrift), // no upper cap
    particleSize: Math.max(0.002, particleSize), // prevent invisible
    breatheDepth: Math.max(0, breatheDepth), // no upper cap
    breatheSpeed: Math.max(0.1, breatheSpeed), // prevent 0
    idleRotation: Math.max(0, idleRotation), // no upper cap
    markingsSeed: Math.abs(markingsSeed),
    scale: Math.max(0.2, scale), // prevent invisible, no upper cap
  };
}

/**
 * Convert DNA appearance to CSS-usable color strings.
 */
export function dnaAppearanceToColors(appearance: DNAAppearance) {
  const h = Math.round(appearance.primaryHue);
  const s = Math.round(appearance.primarySaturation);
  const l = Math.round(appearance.primaryLightness);

  const h2 = Math.round((appearance.primaryHue + appearance.secondaryHueShift) % 360);
  const eyeH = Math.round(appearance.eyeHue);

  return {
    primary: `hsl(${h} ${s}% ${l}%)`,
    secondary: `hsl(${h2} ${s - 5}% ${l + 5}%)`,
    eye: `hsl(${eyeH} 75% 60%)`,
    glow: `hsl(${h} ${s}% ${l + 10}% / ${(appearance.glowIntensity * 0.4).toFixed(2)})`,
    background: `hsl(${h} ${Math.round(s * 0.4)}% 6%)`,
    ring: `hsl(${h} ${s}% 70% / 0.36)`,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
