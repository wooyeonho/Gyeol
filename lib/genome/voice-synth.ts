/**
 * DNA-Driven Voice Synthesis
 *
 * Generates unique creature vocalizations using Tone.js formant synthesis.
 * Each creature's voice is derived from its DNA — the same DNA always produces
 * the same voice timbre, with emotional modulation layered on top.
 *
 * Voice parameters:
 * - baseFreq:   fundamental frequency (warmth → low, analytical → high)
 * - formants:   vowel-like resonances (empathy → rounded, assertiveness → sharp)
 * - breathiness: noise mix (openness → breathy, stability → clear)
 * - vibrato:    pitch wobble (playfulness → fast, persistence → slow)
 * - attack:     onset speed (intensity → fast, stability → slow)
 * - timbre:     oscillator type (creativity → FM, analytical → AM, organic → sine)
 */

import type { CreatureDNA } from "./dna";
import type { SpeciesProfile } from "./species";

export type VoiceDNAParams = {
  /** Fundamental frequency in Hz (80-400) */
  baseFreq: number;
  /** Formant frequencies and gains for vowel shaping */
  formants: { freq: number; gain: number; q: number }[];
  /** Noise mix 0..1 for breathiness */
  breathiness: number;
  /** Vibrato rate in Hz */
  vibratoRate: number;
  /** Vibrato depth in semitones */
  vibratoDepth: number;
  /** Attack time in seconds */
  attack: number;
  /** Decay time in seconds */
  decay: number;
  /** Sustain level 0..1 */
  sustain: number;
  /** Release time in seconds */
  release: number;
  /** Oscillator type */
  timbre: "sine" | "triangle" | "fmsine" | "amsine" | "fmtriangle";
  /** Pitch syllable pattern — sequence of relative semitone offsets for "words" */
  syllablePattern: number[];
  /** Syllable duration in seconds */
  syllableDuration: number;
};

export type EmotionModulation = {
  joy?: number;
  fear?: number;
  curiosity?: number;
  energy?: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Derive unique voice parameters from DNA and species.
 * Deterministic: same DNA → same voice.
 */
export function deriveVoiceParams(dna: CreatureDNA, species: SpeciesProfile): VoiceDNAParams {
  // Base frequency: warm/empathic creatures are lower, analytical/spatial are higher
  const baseFreq = clamp(
    120 + dna.warmth * -40 + dna.analytical * 80 + dna.spatial * 60 - dna.empathy * 30 + dna.intensity * 40,
    80, 400
  );

  // Formant structure: creates vowel-like timbral quality
  // Each creature has 3 formants that shape its "vowel space"
  const f1Base = 300 + dna.warmth * 200 + dna.openness * 150 - dna.analytical * 100;
  const f2Base = 800 + dna.verbal * 400 + dna.creativity * 300 - dna.stability * 200;
  const f3Base = 2200 + dna.spatial * 600 + dna.curiosity * 400 - dna.empathy * 300;

  const formants = [
    { freq: clamp(f1Base, 250, 900), gain: 0.8 + dna.intensity * 0.2, q: 5 + dna.stability * 10 },
    { freq: clamp(f2Base, 600, 2400), gain: 0.5 + dna.verbal * 0.3, q: 8 + dna.analytical * 8 },
    { freq: clamp(f3Base, 1800, 3500), gain: 0.2 + dna.creativity * 0.3, q: 6 + dna.spatial * 6 },
  ];

  // Breathiness from openness and intuition
  const breathiness = clamp(dna.openness * 0.4 + dna.intuitive * 0.3 - dna.stability * 0.2, 0, 0.6);

  // Vibrato
  const vibratoRate = clamp(3 + dna.playfulness * 5 + dna.intensity * 3 - dna.stability * 2, 2, 11);
  const vibratoDepth = clamp(dna.empathy * 0.3 + dna.intensity * 0.2 - dna.analytical * 0.15, 0.02, 0.5);

  // Envelope
  const attack = clamp(0.02 + dna.stability * 0.08 - dna.intensity * 0.015, 0.005, 0.15);
  const decay = clamp(0.1 + dna.warmth * 0.15, 0.05, 0.3);
  const sustain = clamp(0.3 + dna.persistence * 0.4, 0.2, 0.8);
  const release = clamp(0.2 + dna.openness * 0.4 + dna.empathy * 0.2, 0.1, 0.8);

  // Timbre selection based on dominant traits
  let timbre: VoiceDNAParams["timbre"] = "sine";
  if (dna.creativity > 0.65 && dna.creativity > dna.analytical) timbre = "fmsine";
  else if (dna.analytical > 0.65) timbre = "amsine";
  else if (dna.warmth > 0.6 && dna.empathy > 0.55) timbre = "triangle";
  else if (dna.intensity > 0.65) timbre = "fmtriangle";

  // Element influences timbre
  if (species.element === "crystal" || species.element === "ice") timbre = "amsine";
  if (species.element === "fire" || species.element === "storm") timbre = "fmtriangle";

  // Syllable pattern: a sequence of semitone intervals that form the creature's "language"
  const syllablePattern = generateSyllablePattern(dna);
  const syllableDuration = clamp(0.08 + dna.verbal * 0.06 - dna.intensity * 0.02, 0.05, 0.2);

  return {
    baseFreq,
    formants,
    breathiness,
    vibratoRate,
    vibratoDepth,
    attack,
    decay,
    sustain,
    release,
    timbre,
    syllablePattern,
    syllableDuration,
  };
}

/**
 * Apply emotional modulation to voice parameters.
 * Returns modified params without mutating the original.
 */
export function modulateVoice(base: VoiceDNAParams, emotion: EmotionModulation): VoiceDNAParams {
  const joy = emotion.joy ?? 0;
  const fear = emotion.fear ?? 0;
  const curiosity = emotion.curiosity ?? 0;
  const energy = emotion.energy ?? 0.5;

  return {
    ...base,
    baseFreq: base.baseFreq * (1 + joy * 0.15 - fear * 0.1),
    vibratoRate: base.vibratoRate * (1 + fear * 0.3 + curiosity * 0.15),
    vibratoDepth: base.vibratoDepth * (1 + fear * 0.4),
    breathiness: clamp(base.breathiness + fear * 0.2 + (1 - energy) * 0.15, 0, 0.8),
    attack: base.attack * (1 - energy * 0.3),
    syllableDuration: base.syllableDuration * (1 - joy * 0.2 - fear * 0.15 + (1 - energy) * 0.3),
  };
}

/**
 * Generate a deterministic syllable pattern from DNA.
 * This creates the creature's unique "language" — a sequence of pitch intervals.
 */
function generateSyllablePattern(dna: CreatureDNA): number[] {
  // Use DNA values as a seed for the pattern
  const seed = Math.round(
    dna.verbal * 1000 + dna.creativity * 100 + dna.playfulness * 10 + dna.warmth
  );

  const length = 4 + Math.floor(dna.verbal * 4); // 4-8 syllables
  const pattern: number[] = [];

  let hash = seed;
  for (let i = 0; i < length; i++) {
    // Simple LCG PRNG
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    // Map to semitone range: -7 to +12 (octave + fifth)
    const range = dna.intensity > 0.6 ? 14 : dna.stability > 0.6 ? 5 : 9;
    const offset = (hash % (range * 2 + 1)) - range;
    pattern.push(offset);
  }

  return pattern;
}
