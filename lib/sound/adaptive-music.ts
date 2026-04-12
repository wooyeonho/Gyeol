/**
 * Adaptive Music System — dynamic soundtrack that responds to creature state.
 *
 * Inspired by Zelda/Red Desert ambient music systems.
 * Uses Tone.js for real-time audio synthesis.
 */

export type MoodLayer = "calm" | "curious" | "playful" | "tense" | "triumphant" | "melancholy";

export interface MusicConfig {
  bpm: number;
  key: string;
  scale: number[];
  layers: MoodLayer[];
  volume: number;
}

/** Musical scales for different moods (semitone intervals from root) */
const MOOD_SCALES: Record<MoodLayer, number[]> = {
  calm: [0, 2, 4, 5, 7, 9, 11],        // Major scale
  curious: [0, 2, 3, 5, 7, 8, 10],      // Natural minor
  playful: [0, 2, 4, 7, 9],             // Pentatonic major
  tense: [0, 1, 3, 4, 6, 7, 9, 10],    // Diminished scale
  triumphant: [0, 2, 4, 5, 7, 9, 11],   // Lydian mode
  melancholy: [0, 2, 3, 5, 7, 8, 11],   // Harmonic minor
};

/** BPM ranges for different moods */
const MOOD_BPM: Record<MoodLayer, { min: number; max: number }> = {
  calm: { min: 60, max: 80 },
  curious: { min: 80, max: 100 },
  playful: { min: 100, max: 130 },
  tense: { min: 90, max: 120 },
  triumphant: { min: 110, max: 140 },
  melancholy: { min: 55, max: 75 },
};

/**
 * Determine music mood from creature DNA values.
 */
export function getMoodFromDNA(dna: Record<string, number>): MoodLayer {
  const playfulness = dna.playfulness ?? 0;
  const intensity = dna.intensity ?? 0;
  const warmth = dna.warmth ?? 0;
  const curiosity = dna.curiosity ?? 0;
  const stability = dna.stability ?? 0;

  // Score each mood
  const scores: Record<MoodLayer, number> = {
    calm: stability * 2 + warmth,
    curious: curiosity * 2 + (1 - intensity),
    playful: playfulness * 2 + curiosity,
    tense: intensity * 2 + (1 - stability),
    triumphant: intensity + warmth + playfulness,
    melancholy: (1 - playfulness) + (1 - warmth) + stability,
  };

  let bestMood: MoodLayer = "calm";
  let bestScore = -1;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood as MoodLayer;
    }
  }

  return bestMood;
}

/**
 * Generate a music configuration for the given mood.
 */
export function generateMusicConfig(mood: MoodLayer, creatureLevel: number = 1): MusicConfig {
  const bpmRange = MOOD_BPM[mood];
  const bpm = bpmRange.min + Math.floor(Math.random() * (bpmRange.max - bpmRange.min));

  // Root key varies with level for variety
  const keys = ["C", "D", "E", "F", "G", "A", "B"];
  const key = keys[creatureLevel % keys.length];

  return {
    bpm,
    key,
    scale: MOOD_SCALES[mood],
    layers: [mood],
    volume: 0.3,
  };
}

/**
 * Generate a melody pattern based on the scale (array of semitone offsets).
 */
export function generateMelodyPattern(config: MusicConfig, bars: number = 4): number[] {
  const { scale } = config;
  const notesPerBar = 4;
  const pattern: number[] = [];

  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < notesPerBar; beat++) {
      // Melodic movement: prefer stepwise motion
      const prevNote = pattern.length > 0 ? pattern[pattern.length - 1] : scale[0];
      const prevIndex = scale.indexOf(prevNote % 12);
      const step = Math.random() > 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      const nextIndex = Math.max(0, Math.min(scale.length - 1, (prevIndex === -1 ? 0 : prevIndex) + step));
      pattern.push(scale[nextIndex]);
    }
  }

  return pattern;
}

/**
 * Smoothly transition between two mood configs (cross-fade parameters).
 */
export function interpolateConfig(
  from: MusicConfig,
  to: MusicConfig,
  t: number, // 0-1
): MusicConfig {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    bpm: Math.round(from.bpm * (1 - clampedT) + to.bpm * clampedT),
    key: clampedT > 0.5 ? to.key : from.key,
    scale: clampedT > 0.5 ? to.scale : from.scale,
    layers: [...new Set([...from.layers, ...to.layers])],
    volume: from.volume * (1 - clampedT) + to.volume * clampedT,
  };
}

export { MOOD_SCALES, MOOD_BPM };
