/**
 * Rich Idle Behaviors — Baldur's Gate-style autonomous creature states.
 *
 * Instead of just awake/drowsy/sleeping, the creature has a rich set of
 * idle states that transition based on time, mood, DNA, and affinity.
 * Each state has unique visual parameters for the animation system.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export type IdleBehavior =
  | "alert"        // actively engaged, responding to stimuli
  | "curious"      // looking around, exploring visually
  | "daydreaming"  // staring into distance, gentle float
  | "playing"      // self-amusing, bouncing/spinning
  | "restless"     // fidgeting, wants attention
  | "meditating"   // deep calm, minimal movement
  | "nesting"      // settling in, comfort seeking
  | "drowsy"       // getting sleepy
  | "sleeping"     // fully asleep
  | "dreaming";    // asleep with dream visuals (REM)

export interface IdleBehaviorParams {
  /** Scale oscillation amplitude */
  scaleOscillation: number;
  /** Rotation speed multiplier */
  rotationSpeed: number;
  /** Vertical bob amplitude */
  bobAmplitude: number;
  /** Bob frequency multiplier */
  bobFrequency: number;
  /** Eye openness 0..1 (0 = closed, 1 = wide open) */
  eyeOpenness: number;
  /** Emissive intensity multiplier */
  emissiveMult: number;
  /** Particle speed multiplier */
  particleSpeed: number;
  /** Body tilt angle in radians */
  bodyTilt: number;
  /** Whether to show dream particles */
  showDreamParticles: boolean;
  /** Animation speed multiplier for appendages */
  appendageSpeed: number;
}

const BEHAVIOR_PARAMS: Record<IdleBehavior, IdleBehaviorParams> = {
  alert: {
    scaleOscillation: 0.02,
    rotationSpeed: 1.0,
    bobAmplitude: 0.03,
    bobFrequency: 1.0,
    eyeOpenness: 1.0,
    emissiveMult: 1.0,
    particleSpeed: 1.0,
    bodyTilt: 0,
    showDreamParticles: false,
    appendageSpeed: 1.0,
  },
  curious: {
    scaleOscillation: 0.03,
    rotationSpeed: 1.5, // looking around faster
    bobAmplitude: 0.05,
    bobFrequency: 1.2,
    eyeOpenness: 1.15, // wide-eyed
    emissiveMult: 1.1,
    particleSpeed: 1.3,
    bodyTilt: 0.06,
    showDreamParticles: false,
    appendageSpeed: 1.4,
  },
  daydreaming: {
    scaleOscillation: 0.01,
    rotationSpeed: 0.3,
    bobAmplitude: 0.06, // gentle floating
    bobFrequency: 0.5,
    eyeOpenness: 0.7,
    emissiveMult: 0.85,
    particleSpeed: 0.4,
    bodyTilt: 0.04,
    showDreamParticles: true,
    appendageSpeed: 0.3,
  },
  playing: {
    scaleOscillation: 0.06, // bouncy
    rotationSpeed: 2.0, // spinning
    bobAmplitude: 0.1,
    bobFrequency: 2.0,
    eyeOpenness: 1.0,
    emissiveMult: 1.3,
    particleSpeed: 2.0,
    bodyTilt: 0,
    showDreamParticles: false,
    appendageSpeed: 2.5,
  },
  restless: {
    scaleOscillation: 0.04,
    rotationSpeed: 0.8,
    bobAmplitude: 0.04,
    bobFrequency: 1.8, // jittery
    eyeOpenness: 0.9,
    emissiveMult: 0.9,
    particleSpeed: 1.5,
    bodyTilt: -0.03,
    showDreamParticles: false,
    appendageSpeed: 1.8,
  },
  meditating: {
    scaleOscillation: 0.005,
    rotationSpeed: 0.1,
    bobAmplitude: 0.015,
    bobFrequency: 0.3,
    eyeOpenness: 0.3,
    emissiveMult: 1.15, // inner glow
    particleSpeed: 0.2,
    bodyTilt: 0,
    showDreamParticles: false,
    appendageSpeed: 0.2,
  },
  nesting: {
    scaleOscillation: 0.01,
    rotationSpeed: 0.2,
    bobAmplitude: 0.02,
    bobFrequency: 0.4,
    eyeOpenness: 0.6,
    emissiveMult: 0.8,
    particleSpeed: 0.3,
    bodyTilt: -0.02,
    showDreamParticles: false,
    appendageSpeed: 0.4,
  },
  drowsy: {
    scaleOscillation: 0.008,
    rotationSpeed: 0.15,
    bobAmplitude: 0.02,
    bobFrequency: 0.35,
    eyeOpenness: 0.35,
    emissiveMult: 0.6,
    particleSpeed: 0.25,
    bodyTilt: -0.04,
    showDreamParticles: false,
    appendageSpeed: 0.3,
  },
  sleeping: {
    scaleOscillation: 0.005,
    rotationSpeed: 0.05,
    bobAmplitude: 0.01,
    bobFrequency: 0.2,
    eyeOpenness: 0.0,
    emissiveMult: 0.4,
    particleSpeed: 0.1,
    bodyTilt: -0.06,
    showDreamParticles: false,
    appendageSpeed: 0.1,
  },
  dreaming: {
    scaleOscillation: 0.015,
    rotationSpeed: 0.08,
    bobAmplitude: 0.025,
    bobFrequency: 0.25,
    eyeOpenness: 0.0,
    emissiveMult: 0.7, // dream glow
    particleSpeed: 0.6,
    bodyTilt: -0.05,
    showDreamParticles: true,
    appendageSpeed: 0.15,
  },
};

/**
 * Determine the idle behavior based on context.
 * Transitions are influenced by DNA personality, mood, idle time, and affinity.
 */
export function resolveIdleBehavior(params: {
  idleSeconds: number;
  mood: string | null | undefined;
  dna: CreatureDNA | null | undefined;
  affinityMood: string | null | undefined;
  recentTouchCount: number;
  isStreaming: boolean;
}): IdleBehavior {
  const { idleSeconds, mood, dna, affinityMood, recentTouchCount, isStreaming } = params;

  // Active states
  if (isStreaming) return "alert";
  if (recentTouchCount > 5 && idleSeconds < 10) return "playing";

  // Affinity-driven states
  if (affinityMood === "lonely" && idleSeconds > 90) return "restless";
  if (affinityMood === "delighted") return "curious";

  // Sleep cycle
  if (idleSeconds > 180) {
    // Dream state: playful/creative creatures dream more
    const dreamChance = dna ? (dna.creativity * 0.3 + dna.playfulness * 0.2) : 0.2;
    // Use a deterministic check based on idle time to avoid flickering
    const dreamPhase = Math.floor(idleSeconds / 60) % 3;
    if (dreamPhase === 0 && dreamChance > 0.3) return "dreaming";
    return "sleeping";
  }
  if (idleSeconds > 60) return "drowsy";

  // Mood-driven states (when idle 10-60s)
  if (idleSeconds > 10) {
    if (mood === "curious" || mood === "energetic") return "curious";
    if (mood === "melancholy" || mood === "sad") return "nesting";
    if (mood === "joyful" && dna && dna.playfulness > 0.6) return "playing";

    // DNA personality-driven idle
    if (dna) {
      if (dna.stability > 0.7 && dna.warmth > 0.5) return "meditating";
      if (dna.curiosity > 0.7) return "curious";
      if (dna.playfulness > 0.7) return "playing";
      if (dna.independence > 0.7) return "daydreaming";
    }

    return "daydreaming";
  }

  // Recently active but momentarily idle
  return "alert";
}

export function getIdleBehaviorParams(behavior: IdleBehavior): IdleBehaviorParams {
  return BEHAVIOR_PARAMS[behavior];
}
