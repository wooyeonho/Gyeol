/**
 * Creature Voice Synthesis
 *
 * Generates emotion-specific vocalization parameters for the creature.
 * Each emotion maps to a distinct frequency range, duration, and modulation
 * pattern, producing unique creature "voices" via Web Audio oscillators.
 *
 * DNA axes influence the output:
 * - `playfulness` shifts pitch range upward (more playful = higher)
 * - `intensity` scales volume (more intense = louder)
 *
 * Designed to layer on top of the existing emotion-sounds system,
 * providing a complementary voice channel with richer modulation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModulationPattern =
  | "none"
  | "rising"
  | "falling"
  | "trembling"
  | "oscillating"
  | "rough";

export type CreatureVoiceProfile = {
  /** Base oscillator frequency in Hz */
  pitch: number;
  /** Total vocalization duration in ms */
  duration: number;
  /** Modulation pattern applied to the oscillator */
  modulationPattern: ModulationPattern;
  /** Modulation rate in Hz (LFO speed) — 0 if pattern is "none" */
  modulationRate: number;
  /** Modulation depth in Hz (LFO amplitude) */
  modulationDepth: number;
  /** Oscillator waveform type */
  waveform: OscillatorType;
  /** Volume 0..1 */
  volume: number;
  /** Optional frequency target for ramps (rising/falling patterns) */
  pitchEnd?: number;
};

// ---------------------------------------------------------------------------
// Emotion voice definitions
// ---------------------------------------------------------------------------

type EmotionVoiceDef = {
  pitchMin: number;
  pitchMax: number;
  durationMin: number;
  durationMax: number;
  modulationPattern: ModulationPattern;
  modulationRate: number;
  modulationDepth: number;
  waveform: OscillatorType;
  baseVolume: number;
  /** If set, the pitch ramps to this ratio of the base pitch */
  pitchEndRatio?: number;
};

const EMOTION_VOICES: Record<string, EmotionVoiceDef> = {
  // ── Happy / Joy: chirpy rising tones ──
  happy: {
    pitchMin: 400,
    pitchMax: 800,
    durationMin: 80,
    durationMax: 200,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.18,
    pitchEndRatio: 1.3,
  },
  joyful: {
    pitchMin: 420,
    pitchMax: 820,
    durationMin: 80,
    durationMax: 200,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.18,
    pitchEndRatio: 1.35,
  },

  // ── Sad / Lonely: low humming ──
  sad: {
    pitchMin: 200,
    pitchMax: 300,
    durationMin: 500,
    durationMax: 800,
    modulationPattern: "falling",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.1,
    pitchEndRatio: 0.85,
  },
  lonely: {
    pitchMin: 210,
    pitchMax: 290,
    durationMin: 550,
    durationMax: 800,
    modulationPattern: "falling",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.08,
    pitchEndRatio: 0.8,
  },

  // ── Surprised: sharp squeak ──
  surprised: {
    pitchMin: 600,
    pitchMax: 1000,
    durationMin: 50,
    durationMax: 120,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.2,
    pitchEndRatio: 1.5,
  },

  // ── Content / Calm: soft purring ──
  content: {
    pitchMin: 150,
    pitchMax: 250,
    durationMin: 400,
    durationMax: 700,
    modulationPattern: "oscillating",
    modulationRate: 5,
    modulationDepth: 15,
    waveform: "sine",
    baseVolume: 0.08,
  },
  peaceful: {
    pitchMin: 155,
    pitchMax: 245,
    durationMin: 450,
    durationMax: 700,
    modulationPattern: "oscillating",
    modulationRate: 4.5,
    modulationDepth: 12,
    waveform: "sine",
    baseVolume: 0.07,
  },

  // ── Scared: whimper with trembling ──
  scared: {
    pitchMin: 300,
    pitchMax: 500,
    durationMin: 200,
    durationMax: 450,
    modulationPattern: "trembling",
    modulationRate: 10,
    modulationDepth: 25,
    waveform: "triangle",
    baseVolume: 0.12,
  },

  // ── Angry: growl with rough oscillation ──
  angry: {
    pitchMin: 100,
    pitchMax: 200,
    durationMin: 250,
    durationMax: 450,
    modulationPattern: "rough",
    modulationRate: 8,
    modulationDepth: 20,
    waveform: "sawtooth",
    baseVolume: 0.14,
  },

  // ── Additional emotions mapped to closest archetypes ──
  excited: {
    pitchMin: 450,
    pitchMax: 850,
    durationMin: 60,
    durationMax: 180,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "sine",
    baseVolume: 0.17,
    pitchEndRatio: 1.4,
  },
  curious: {
    pitchMin: 350,
    pitchMax: 600,
    durationMin: 150,
    durationMax: 350,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "triangle",
    baseVolume: 0.12,
    pitchEndRatio: 1.25,
  },
  playful: {
    pitchMin: 500,
    pitchMax: 900,
    durationMin: 70,
    durationMax: 180,
    modulationPattern: "rising",
    modulationRate: 0,
    modulationDepth: 0,
    waveform: "triangle",
    baseVolume: 0.15,
    pitchEndRatio: 1.2,
  },
  sleepy: {
    pitchMin: 140,
    pitchMax: 220,
    durationMin: 500,
    durationMax: 800,
    modulationPattern: "oscillating",
    modulationRate: 2,
    modulationDepth: 6,
    waveform: "sine",
    baseVolume: 0.05,
  },
};

// Alias map for moods that share a voice archetype
const VOICE_ALIASES: Record<string, string> = {
  joy: "happy",
  calm: "content",
  serene: "peaceful",
  melancholy: "sad",
  frustrated: "angry",
  proud: "happy",
  inspired: "curious",
  loving: "content",
  grateful: "content",
  tender: "peaceful",
  thoughtful: "peaceful",
  focused: "peaceful",
  dreamy: "sleepy",
  mischievous: "playful",
  energetic: "excited",
  shy: "scared",
  jealous: "angry",
  confused: "curious",
  bored: "sleepy",
  neutral: "content",
};

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Resolve a mood string to a voice definition key.
 * Falls back to "content" for unrecognised moods.
 */
function resolveVoiceKey(emotion: string): string {
  const lower = emotion.toLowerCase().trim();
  if (EMOTION_VOICES[lower]) return lower;
  const alias = VOICE_ALIASES[lower];
  if (alias && EMOTION_VOICES[alias]) return alias;
  return "content";
}

/**
 * Get creature voice parameters for a given emotion, influenced by DNA.
 *
 * @param emotion - Current creature emotion/mood string
 * @param dna     - Record of DNA axis values (0..1). Uses `playfulness` and `intensity`.
 * @returns       - A fully resolved `CreatureVoiceProfile` ready for synthesis.
 */
export function getCreatureVoice(
  emotion: string,
  dna: Record<string, number>,
): CreatureVoiceProfile {
  const key = resolveVoiceKey(emotion);
  const def = EMOTION_VOICES[key];

  // DNA influence: playfulness shifts pitch upward, intensity scales volume
  const playfulness = clamp(dna.playfulness ?? 0.5, 0, 1);
  const intensity = clamp(dna.intensity ?? 0.5, 0, 1);

  // Playfulness maps to a position within the pitch range (0 = low end, 1 = high end)
  const pitch = def.pitchMin + playfulness * (def.pitchMax - def.pitchMin);

  // Duration: pick midpoint with slight randomness-friendly deterministic offset from DNA
  const duration = def.durationMin + (1 - playfulness) * 0.5 * (def.durationMax - def.durationMin)
    + intensity * 0.3 * (def.durationMax - def.durationMin);

  // Volume: base scaled by intensity (0.3..1.0 range to keep quiet creatures still audible)
  const volume = def.baseVolume * (0.3 + intensity * 0.7);

  const profile: CreatureVoiceProfile = {
    pitch,
    duration: Math.round(clamp(duration, def.durationMin, def.durationMax)),
    modulationPattern: def.modulationPattern,
    modulationRate: def.modulationRate,
    modulationDepth: def.modulationDepth,
    waveform: def.waveform,
    volume: clamp(volume, 0, 1),
  };

  if (def.pitchEndRatio !== undefined) {
    profile.pitchEnd = pitch * def.pitchEndRatio;
  }

  return profile;
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/**
 * Play a creature vocalization using the Web Audio API.
 * Creates a short oscillator burst with the given voice profile.
 * Fails silently if AudioContext is unavailable (SSR, no audio device).
 */
export function playCreatureVoice(profile: CreatureVoiceProfile): void {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = profile.waveform;
    osc.frequency.setValueAtTime(profile.pitch, ctx.currentTime);

    const durationSec = profile.duration / 1000;
    const attackSec = Math.min(durationSec * 0.15, 0.03);
    const releaseSec = Math.min(durationSec * 0.25, 0.08);

    // Gain envelope: quick attack, sustain, gentle release
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(profile.volume, ctx.currentTime + attackSec);
    gain.gain.setValueAtTime(profile.volume, ctx.currentTime + durationSec - releaseSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    // Frequency ramp for rising/falling patterns
    if (profile.pitchEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(profile.pitchEnd, ctx.currentTime + durationSec);
    }

    // LFO for trembling / oscillating / rough patterns
    if (profile.modulationRate > 0 && profile.modulationDepth > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = profile.modulationPattern === "rough" ? "square" : "sine";
      lfo.frequency.value = profile.modulationRate;
      lfoGain.gain.value = profile.modulationDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(ctx.currentTime);
      lfo.stop(ctx.currentTime + durationSec);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec + 0.01);

    // Cleanup
    setTimeout(() => { void ctx.close(); }, (durationSec + 0.3) * 1000);
  } catch {
    // Audio not available — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
