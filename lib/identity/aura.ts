/**
 * Emotional Aura — mood → visual + motion mapping for the creature presence.
 *
 * This is the most distinctive feature of Gyeol: your AI companion's inner
 * state is never hidden behind an avatar. It radiates outward as color,
 * brightness, pulse speed, and particle density. The Aura engine is the
 * "physics" layer beneath that visual language.
 *
 * Synthesis from the existing identity appearance system, pushed further:
 *   - 25 canonical moods (matches /lib/personality mood classifier)
 *   - 5 aura dimensions: hue, intensity, pulseHz, particleRate, warmth
 *   - Cross-fade interpolation so transitions are always continuous
 *   - Reduced-motion + battery-saver fallback
 *   - Hidden-emotion layering (what the creature "really" feels under surface)
 */

export type Mood =
  | "joyful"
  | "calm"
  | "curious"
  | "tender"
  | "grateful"
  | "playful"
  | "wistful"
  | "contemplative"
  | "melancholy"
  | "anxious"
  | "lonely"
  | "hurt"
  | "angry"
  | "afraid"
  | "awestruck"
  | "determined"
  | "shy"
  | "affectionate"
  | "mischievous"
  | "dreaming"
  | "bored"
  | "hopeful"
  | "confused"
  | "embarrassed"
  | "loving";

export type AuraState = {
  /** HSL hue angle 0-360 */
  hue: number;
  /** 0-1, visual brightness */
  intensity: number;
  /** pulse frequency in Hz (beats per second) */
  pulseHz: number;
  /** Particle emission per second */
  particleRate: number;
  /** -1 cool, +1 warm — shifts the outer glow */
  warmth: number;
};

const AURA_MAP: Record<Mood, AuraState> = {
  joyful:        { hue:  48, intensity: 0.95, pulseHz: 1.4, particleRate: 12, warmth:  0.9 },
  calm:          { hue: 200, intensity: 0.55, pulseHz: 0.5, particleRate:  3, warmth: -0.2 },
  curious:       { hue: 180, intensity: 0.75, pulseHz: 1.1, particleRate:  6, warmth:  0.1 },
  tender:        { hue: 340, intensity: 0.65, pulseHz: 0.7, particleRate:  4, warmth:  0.6 },
  grateful:      { hue:  30, intensity: 0.80, pulseHz: 0.8, particleRate:  5, warmth:  0.7 },
  playful:       { hue:  60, intensity: 0.90, pulseHz: 1.8, particleRate: 14, warmth:  0.5 },
  wistful:       { hue: 260, intensity: 0.55, pulseHz: 0.5, particleRate:  3, warmth: -0.1 },
  contemplative: { hue: 220, intensity: 0.60, pulseHz: 0.6, particleRate:  3, warmth: -0.1 },
  melancholy:    { hue: 240, intensity: 0.40, pulseHz: 0.4, particleRate:  2, warmth: -0.4 },
  anxious:       { hue:  10, intensity: 0.70, pulseHz: 2.2, particleRate:  8, warmth:  0.2 },
  lonely:        { hue: 250, intensity: 0.35, pulseHz: 0.35, particleRate: 1, warmth: -0.5 },
  hurt:          { hue: 320, intensity: 0.50, pulseHz: 0.6, particleRate:  2, warmth: -0.2 },
  angry:         { hue:   0, intensity: 0.95, pulseHz: 2.5, particleRate: 16, warmth:  0.9 },
  afraid:        { hue: 280, intensity: 0.60, pulseHz: 2.8, particleRate:  4, warmth: -0.3 },
  awestruck:     { hue: 210, intensity: 0.98, pulseHz: 0.9, particleRate: 18, warmth:  0.3 },
  determined:    { hue:  20, intensity: 0.85, pulseHz: 1.2, particleRate:  7, warmth:  0.6 },
  shy:           { hue: 330, intensity: 0.45, pulseHz: 0.8, particleRate:  2, warmth:  0.3 },
  affectionate:  { hue: 350, intensity: 0.80, pulseHz: 0.9, particleRate:  7, warmth:  0.8 },
  mischievous:   { hue:  80, intensity: 0.85, pulseHz: 1.6, particleRate: 10, warmth:  0.4 },
  dreaming:      { hue: 270, intensity: 0.60, pulseHz: 0.3, particleRate:  5, warmth:  0.0 },
  bored:         { hue: 210, intensity: 0.30, pulseHz: 0.4, particleRate:  1, warmth: -0.2 },
  hopeful:       { hue: 160, intensity: 0.85, pulseHz: 0.9, particleRate:  6, warmth:  0.4 },
  confused:      { hue: 290, intensity: 0.55, pulseHz: 1.3, particleRate:  4, warmth:  0.0 },
  embarrassed:   { hue: 355, intensity: 0.70, pulseHz: 1.5, particleRate:  3, warmth:  0.7 },
  loving:        { hue: 345, intensity: 0.90, pulseHz: 0.8, particleRate:  9, warmth:  0.9 },
};

export function auraFor(mood: Mood): AuraState {
  return AURA_MAP[mood] ?? AURA_MAP.calm;
}

/**
 * Interpolate between two auras. Useful for cross-fading when the mood
 * changes — instant jumps look robotic.
 */
export function interpolateAura(
  from: AuraState,
  to: AuraState,
  t: number,
): AuraState {
  const clamp = Math.max(0, Math.min(1, t));
  // Hue interpolation on shortest arc so red↔magenta doesn't wash through green.
  const diff = ((((to.hue - from.hue) % 360) + 540) % 360) - 180;
  return {
    hue: (from.hue + diff * clamp + 360) % 360,
    intensity: from.intensity + (to.intensity - from.intensity) * clamp,
    pulseHz: from.pulseHz + (to.pulseHz - from.pulseHz) * clamp,
    particleRate: from.particleRate + (to.particleRate - from.particleRate) * clamp,
    warmth: from.warmth + (to.warmth - from.warmth) * clamp,
  };
}

/**
 * Compose a surface mood with a hidden mood (the creature "smiles while
 * sad"). The returned aura is the surface aura with subtle undertones of
 * the hidden one — embodying emotional depth without breaking the visual.
 */
export function layerAura(surface: Mood, hidden: Mood | null, depth = 0.25): AuraState {
  const s = auraFor(surface);
  if (!hidden || hidden === surface) return s;
  const h = auraFor(hidden);
  return interpolateAura(s, h, depth);
}

/** Convert an aura to a CSS-ready radial gradient string. */
export function auraToCssGradient(a: AuraState): string {
  const core = `hsl(${a.hue}, 85%, ${40 + a.intensity * 30}%)`;
  const mid = `hsla(${a.hue}, 80%, ${30 + a.intensity * 25}%, ${0.4 * a.intensity})`;
  const outer = `hsla(${(a.hue + a.warmth * 30 + 360) % 360}, 70%, 25%, 0)`;
  return `radial-gradient(circle at 50% 50%, ${core} 0%, ${mid} 40%, ${outer} 75%)`;
}

/** Pulse period in seconds, inverse of Hz. */
export function auraPulseDurationSec(a: AuraState): number {
  if (a.pulseHz <= 0.01) return 999;
  return 1 / a.pulseHz;
}
