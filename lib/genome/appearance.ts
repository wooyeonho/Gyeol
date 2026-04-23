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
  // ── New 32-axis properties ──
  /** Surface texture from DNA */
  furDensity: number;
  patternComplexity: number;
  transparency: number;
  shininess: number;
  /** Expression */
  eyeScale: number;
  blushAmount: number;
  glowReactivity: number;
  /** Body morphology */
  bodyElongation: number;
  limbExtension: number;
  headScale: number;
  /** Elemental */
  elementalHueShift: number;
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
    dna.intuitive * 260 +     // intuitive → indigo
    dna.elementalAffinity * 200 + // elemental → teal/ethereal shift
    dna.shininess * 50        // shiny → warm gold shift
    ) / 10;

  const saturation = 62 + dna.intensity * 22 + dna.playfulness * 10 + dna.shininess * 8;
  const lightness = 48 + dna.warmth * 14 + dna.openness * 10 - dna.independence * 6
    + dna.glowReactivity * 5 - dna.bodyDensity * 4;

  const secondaryHueShift = 30 + dna.creativity * 60 - dna.stability * 20;

  // Eye color: circular weighted blend of emotional DNA axes — no discrete thresholds.
  // Uses atan2-based circular mean to handle hue wraparound (e.g. 340° pink + 20° gold = ~0° red, not 180° cyan).
  const DEG2RAD = Math.PI / 180;
  const eyeAxes: [number, number][] = [
    [dna.empathy, 340], [dna.intensity, 30], [dna.curiosity, 190],
    [dna.stability, 140], [dna.warmth, 20], [dna.creativity, 280], [dna.openness, 200],
  ];
  let sinSum = 0, cosSum = 0;
  for (const [w, h] of eyeAxes) {
    sinSum += w * Math.sin(h * DEG2RAD);
    cosSum += w * Math.cos(h * DEG2RAD);
  }
  const eyeHue = ((Math.atan2(sinSum, cosSum) / DEG2RAD) + 360) % 360;

  // Body shape from cognitive/structural DNA + new physical axes
  const bodyRatio = 0.3 + dna.verbal * 0.3 + dna.spatial * 0.2 - dna.stability * 0.15
    + dna.bodyShape * 0.25;
  const bodySymmetry = 0.3 + dna.stability * 0.3 + dna.analytical * 0.25 - dna.creativity * 0.15;

  // Surface from DNA + new surface axes
  const roughness = 0.1 + (1 - dna.stability) * 0.4 + dna.assertiveness * 0.2
    + dna.furDensity * 0.25;
  const metalness = dna.analytical * 0.3 + dna.spatial * 0.2
    + dna.shininess * 0.35;

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

  const glowIntensity = (0.45 + dna.openness * 0.25 + dna.creativity * 0.2
    + dna.glowReactivity * 0.3) * archetypeGlowMod
    * (0.85 + evo.dnaExpressionRange * 0.15); // evolution capacity boosts glow
  const glowPulseSpeed = 0.5 + dna.intensity * 0.8 + dna.playfulness * 0.4
    + dna.glowReactivity * 0.3;

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
  const scale = 0.85 + dna.assertiveness * 0.15 + dna.persistence * 0.1
    + dna.bodyDensity * 0.1;

  // ── New 32-axis derived properties ──
  const furDensity = dna.furDensity;
  const patternComplexity = dna.patternComplexity;
  const transparency = dna.transparency;
  const shininess = dna.shininess;
  const eyeScale = 0.6 + dna.eyeSize * 0.8;
  const blushAmount = dna.blushIntensity;
  const glowReactivity = dna.glowReactivity;
  const bodyElongation = dna.bodyShape;
  const limbExtension = dna.limbLength;
  const headScale = 0.8 + dna.headRatio * 0.5;
  const elementalHueShift = dna.elementalAffinity * 40 - 20;

  // ── Open ranges: no artificial ceiling on expression ──
  // Only enforce physical minimums (no negative opacity, etc.)
  // DNA + evolution capacity determine the actual range — not developer clamps.
  return {
    primaryHue: primaryHue % 360,
    primarySaturation: Math.max(0, saturation),
    primaryLightness: Math.max(0, lightness), // no upper cap — DNA determines brightness
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
    // New 32-axis properties
    furDensity,
    patternComplexity,
    transparency,
    shininess,
    eyeScale: Math.max(0.3, eyeScale),
    blushAmount: Math.max(0, blushAmount),
    glowReactivity: Math.max(0, glowReactivity),
    bodyElongation: Math.max(0, bodyElongation),
    limbExtension: Math.max(0, limbExtension),
    headScale: Math.max(0.4, headScale),
    elementalHueShift,
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

/**
 * Apply vitality-based visual regression (devolution).
 *
 * When vitality drops below 1.0 the creature's appearance degrades:
 * - Colors desaturate toward grayscale
 * - Glow and emissive intensity fade
 * - Particle count and drift shrink
 * - Breathe amplitude dampens
 * - Scale contracts slightly
 *
 * vitality 1.0 = no change, 0.0 = fully regressed.
 */
export function applyVitalityRegression(
  base: DNAAppearance,
  vitality: number,
): DNAAppearance {
  // Clamp vitality to [0, 1] — values above 1 mean no regression
  const v = Math.max(0, Math.min(1, vitality));
  if (v >= 1) return base;

  // Regression factor: 0 at full vitality, 1 at zero vitality
  const r = 1 - v;

  return {
    ...base,
    // Desaturate: saturation fades toward 0 as vitality drops
    primarySaturation: Math.max(0, base.primarySaturation * (1 - r * 0.85)),
    // Lightness shifts toward a dull grey (40%)
    primaryLightness: base.primaryLightness + (40 - base.primaryLightness) * r * 0.6,
    // Glow fades
    glowIntensity: Math.max(0, base.glowIntensity * (1 - r * 0.9)),
    glowPulseSpeed: Math.max(0.1, base.glowPulseSpeed * (1 - r * 0.5)),
    // Particles shrink and slow
    particleCount: Math.max(0, Math.round(base.particleCount * (1 - r * 0.7))),
    particleDrift: Math.max(0, base.particleDrift * (1 - r * 0.6)),
    particleSize: Math.max(0.002, base.particleSize * (1 - r * 0.4)),
    // Breathing dampens
    breatheDepth: Math.max(0, base.breatheDepth * (1 - r * 0.7)),
    breatheSpeed: Math.max(0.1, base.breatheSpeed * (1 - r * 0.4)),
    // Body shrinks slightly
    scale: Math.max(0.2, base.scale * (1 - r * 0.15)),
    // Idle rotation slows
    idleRotation: Math.max(0, base.idleRotation * (1 - r * 0.6)),
  };
}
