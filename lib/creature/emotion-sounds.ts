/**
 * Creature Emotion Sound System
 *
 * Maps creature moods to procedural audio parameters.
 * Used by Soundscape to play real-time emotion-reactive sounds.
 *
 * Design: Each mood has a characteristic sound "voice" —
 * joyful creatures chirp, sad ones hum low, surprised ones squeak.
 * The creature's DNA influences pitch range and timbre.
 */

export interface EmotionSoundParams {
  /** Base frequency in Hz */
  frequency: number;
  /** Sound type for Web Audio oscillator */
  waveform: OscillatorType;
  /** Duration in seconds */
  duration: number;
  /** Number of rapid notes (1 = single tone, 3 = chirp) */
  noteCount: number;
  /** Pitch variation between notes (semitones) */
  pitchSpread: number;
  /** Volume 0-1 */
  volume: number;
  /** Detune in cents for organic feel */
  detune: number;
}

const EMOTION_SOUNDS: Record<string, EmotionSoundParams> = {
  // Positive — bright, high, fast
  joyful:      { frequency: 880, waveform: "sine", duration: 0.12, noteCount: 3, pitchSpread: 4, volume: 0.15, detune: 10 },
  excited:     { frequency: 932, waveform: "sine", duration: 0.08, noteCount: 4, pitchSpread: 5, volume: 0.18, detune: 15 },
  playful:     { frequency: 784, waveform: "triangle", duration: 0.1, noteCount: 3, pitchSpread: 3, volume: 0.12, detune: 20 },
  loving:      { frequency: 523, waveform: "sine", duration: 0.25, noteCount: 2, pitchSpread: 2, volume: 0.1, detune: 5 },
  proud:       { frequency: 659, waveform: "sine", duration: 0.2, noteCount: 2, pitchSpread: 7, volume: 0.12, detune: 0 },

  // Calm — soft, sustained
  peaceful:    { frequency: 392, waveform: "sine", duration: 0.4, noteCount: 1, pitchSpread: 0, volume: 0.06, detune: 0 },
  curious:     { frequency: 698, waveform: "triangle", duration: 0.15, noteCount: 2, pitchSpread: 5, volume: 0.1, detune: 8 },
  dreamy:      { frequency: 440, waveform: "sine", duration: 0.5, noteCount: 1, pitchSpread: 0, volume: 0.05, detune: -5 },

  // Negative — low, slow
  sad:         { frequency: 262, waveform: "sine", duration: 0.6, noteCount: 1, pitchSpread: 0, volume: 0.08, detune: -10 },
  melancholy:  { frequency: 294, waveform: "sine", duration: 0.5, noteCount: 2, pitchSpread: -2, volume: 0.07, detune: -8 },
  lonely:      { frequency: 247, waveform: "sine", duration: 0.7, noteCount: 1, pitchSpread: 0, volume: 0.06, detune: -15 },
  angry:       { frequency: 196, waveform: "sawtooth", duration: 0.15, noteCount: 2, pitchSpread: -3, volume: 0.12, detune: 25 },
  frustrated:  { frequency: 220, waveform: "sawtooth", duration: 0.12, noteCount: 3, pitchSpread: -2, volume: 0.1, detune: 20 },

  // Reactive — sharp, distinctive
  surprised:   { frequency: 1047, waveform: "sine", duration: 0.06, noteCount: 1, pitchSpread: 0, volume: 0.2, detune: 30 },
  scared:      { frequency: 587, waveform: "triangle", duration: 0.05, noteCount: 5, pitchSpread: 1, volume: 0.1, detune: 40 },
  shy:         { frequency: 494, waveform: "sine", duration: 0.2, noteCount: 1, pitchSpread: 0, volume: 0.04, detune: -5 },
};

/**
 * Get sound parameters for a given mood.
 * Returns null for moods without defined sounds (e.g. neutral).
 */
export function getEmotionSound(mood: string | null | undefined): EmotionSoundParams | null {
  if (!mood) return null;
  return EMOTION_SOUNDS[mood] ?? null;
}

/**
 * Play a creature emotion sound using Web Audio API.
 * Lightweight — no library dependencies, just raw oscillators.
 *
 * @param mood - Current creature mood
 * @param dnaModifier - 0..1 from DNA that shifts pitch (higher = brighter)
 */
export function playEmotionSound(mood: string | null | undefined, dnaModifier = 0.5): void {
  const params = getEmotionSound(mood);
  if (!params) return;

  try {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = params.volume;

    for (let i = 0; i < params.noteCount; i++) {
      const osc = ctx.createOscillator();
      osc.type = params.waveform;
      // DNA modifier shifts pitch ±1 octave
      const dnaShift = (dnaModifier - 0.5) * 200;
      osc.frequency.value = params.frequency + i * params.pitchSpread * 20 + dnaShift;
      osc.detune.value = params.detune;
      osc.connect(gainNode);

      const startTime = ctx.currentTime + i * params.duration * 0.8;
      osc.start(startTime);
      osc.stop(startTime + params.duration);
    }

    // Cleanup after all notes finish
    setTimeout(() => ctx.close(), (params.noteCount * params.duration + 0.5) * 1000);
  } catch {
    // Audio not available — silently ignore
  }
}

/**
 * Check if an emotion sound should trigger (not every frame).
 * Only triggers on mood changes, not continuously.
 */
let lastPlayedMood: string | null = null;
let lastPlayedTime = 0;

export function shouldPlayEmotionSound(mood: string | null | undefined): boolean {
  if (!mood) return false;
  const now = Date.now();
  // Don't replay same mood within 10 seconds
  if (mood === lastPlayedMood && now - lastPlayedTime < 10_000) return false;
  // Only play for moods that have sounds
  if (!EMOTION_SOUNDS[mood]) return false;
  lastPlayedMood = mood;
  lastPlayedTime = now;
  return true;
}
