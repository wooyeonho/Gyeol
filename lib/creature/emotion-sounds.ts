/**
 * Creature Emotion Voice System
 *
 * Each emotion triggers a unique synthesized sound:
 * - happy/excited: chirpy ascending notes (짹짹)
 * - sad/lonely: low humming descending tone (웅웅)
 * - surprised: sharp high pitch (삐!)
 * - scared: trembling wavering tone
 * - angry: growling low rumble
 * - curious: questioning ascending glissando
 * - sleepy: soft low breathing sound
 * - love: warm harmonic chord
 * - playful: bouncy staccato notes
 * - calm: gentle sustained pad
 *
 * Uses OscillatorNode + GainNode for synthesis.
 * Short durations (200-800ms) to avoid annoyance.
 * Volume respects user preference (stored in localStorage).
 */

// ---------------------------------------------------------------------------
// Volume persistence
// ---------------------------------------------------------------------------

const VOLUME_KEY = "creature-voice-volume";

export function setCreatureVoiceVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  try {
    localStorage.setItem(VOLUME_KEY, String(clamped));
  } catch {
    // localStorage not available
  }
}

export function getCreatureVoiceVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null) {
      const v = parseFloat(stored);
      if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
    }
  } catch {
    // fallback
  }
  return 0.5; // default 50%
}

// ---------------------------------------------------------------------------
// Sound recipe types
// ---------------------------------------------------------------------------

interface OscLayer {
  /** Waveform type */
  type: OscillatorType;
  /** Base frequency in Hz */
  freq: number;
  /** Frequency multiplier (for harmonics) */
  freqMult?: number;
  /** Detune in cents */
  detune?: number;
  /** Volume relative to master (0-1) */
  gain: number;
  /** Delay before this layer starts (seconds) */
  delay?: number;
  /** Duration of this layer (seconds) */
  duration: number;
  /** Attack time (seconds) */
  attack?: number;
  /** Decay time (seconds) — from peak to sustain */
  decay?: number;
  /** Release time (seconds) — from end to silence */
  release?: number;
  /** Frequency ramp target (for glissando/slides) */
  freqEnd?: number;
  /** Vibrato rate in Hz */
  vibratoRate?: number;
  /** Vibrato depth in Hz */
  vibratoDepth?: number;
  /** Number of repeated staccato notes */
  noteCount?: number;
  /** Gap between staccato notes (seconds) */
  noteGap?: number;
}

interface EmotionRecipe {
  layers: OscLayer[];
  /** Total duration hint for cleanup (seconds) */
  totalDuration: number;
}

// ---------------------------------------------------------------------------
// Emotion recipes — 1-3 oscillators each, cute creature-like sounds
// ---------------------------------------------------------------------------

function makeRecipes(dnaShift: number): Record<string, EmotionRecipe> {
  // dnaShift: -100 to +100 cents shift from DNA modifier
  const ds = dnaShift;

  return {
    // ── Happy / Joyful: chirpy ascending triplet (짹짹짹) ──
    joyful: {
      totalDuration: 0.55,
      layers: [
        { type: "sine", freq: 880 + ds, gain: 0.22, duration: 0.1, attack: 0.01, decay: 0.05, release: 0.04, noteCount: 3, noteGap: 0.08 },
        { type: "triangle", freq: 1320 + ds, gain: 0.08, duration: 0.08, attack: 0.01, decay: 0.04, release: 0.03, noteCount: 3, noteGap: 0.08, delay: 0.02 },
      ],
    },

    // ── Excited: rapid ascending chirps with higher pitch ──
    excited: {
      totalDuration: 0.5,
      layers: [
        { type: "sine", freq: 988 + ds, gain: 0.2, duration: 0.06, attack: 0.005, decay: 0.03, release: 0.02, noteCount: 4, noteGap: 0.06 },
        { type: "triangle", freq: 1480 + ds, gain: 0.1, duration: 0.05, attack: 0.005, decay: 0.02, release: 0.02, noteCount: 4, noteGap: 0.06, delay: 0.01 },
        { type: "sine", freq: 1976 + ds, gain: 0.04, duration: 0.04, attack: 0.005, decay: 0.02, release: 0.01, noteCount: 4, noteGap: 0.06, delay: 0.02 },
      ],
    },

    // ── Sad: low descending hum (웅웅) ──
    sad: {
      totalDuration: 0.8,
      layers: [
        { type: "sine", freq: 280 + ds * 0.3, gain: 0.12, duration: 0.7, attack: 0.1, decay: 0.3, release: 0.3, freqEnd: 220 + ds * 0.3 },
        { type: "triangle", freq: 140 + ds * 0.15, gain: 0.05, duration: 0.6, attack: 0.15, decay: 0.2, release: 0.25, delay: 0.05 },
      ],
    },

    // ── Lonely: soft single descending tone ──
    lonely: {
      totalDuration: 0.8,
      layers: [
        { type: "sine", freq: 330 + ds * 0.3, gain: 0.09, duration: 0.75, attack: 0.15, decay: 0.3, release: 0.3, freqEnd: 247 + ds * 0.3 },
        { type: "sine", freq: 495 + ds * 0.3, gain: 0.03, duration: 0.6, attack: 0.2, decay: 0.2, release: 0.2, delay: 0.08, freqEnd: 370 + ds * 0.3 },
      ],
    },

    melancholy: {
      totalDuration: 0.75,
      layers: [
        { type: "sine", freq: 294 + ds * 0.3, gain: 0.1, duration: 0.65, attack: 0.12, decay: 0.25, release: 0.28, freqEnd: 262 + ds * 0.3 },
        { type: "triangle", freq: 440 + ds * 0.3, gain: 0.04, duration: 0.5, attack: 0.15, decay: 0.2, release: 0.15, delay: 0.06 },
      ],
    },

    // ── Surprised: sharp high-pitched squeak (삐!) ──
    surprised: {
      totalDuration: 0.3,
      layers: [
        { type: "sine", freq: 1200 + ds, gain: 0.25, duration: 0.08, attack: 0.003, decay: 0.03, release: 0.05, freqEnd: 1600 + ds },
        { type: "triangle", freq: 1800 + ds, gain: 0.08, duration: 0.06, attack: 0.003, decay: 0.02, release: 0.03, delay: 0.01 },
      ],
    },

    // ── Scared: trembling wavering tone ──
    scared: {
      totalDuration: 0.6,
      layers: [
        { type: "triangle", freq: 600 + ds * 0.5, gain: 0.12, duration: 0.5, attack: 0.02, decay: 0.2, release: 0.28, vibratoRate: 12, vibratoDepth: 30 },
        { type: "sine", freq: 900 + ds * 0.5, gain: 0.06, duration: 0.45, attack: 0.03, decay: 0.15, release: 0.27, delay: 0.02, vibratoRate: 14, vibratoDepth: 20 },
      ],
    },

    // ── Angry: growling low rumble ──
    angry: {
      totalDuration: 0.5,
      layers: [
        { type: "sawtooth", freq: 120 + ds * 0.2, gain: 0.14, duration: 0.35, attack: 0.01, decay: 0.15, release: 0.19 },
        { type: "sawtooth", freq: 180 + ds * 0.2, gain: 0.08, duration: 0.3, attack: 0.02, decay: 0.12, release: 0.16, detune: 30 },
        { type: "sine", freq: 80 + ds * 0.1, gain: 0.1, duration: 0.4, attack: 0.01, decay: 0.2, release: 0.19, delay: 0.02 },
      ],
    },

    frustrated: {
      totalDuration: 0.45,
      layers: [
        { type: "sawtooth", freq: 150 + ds * 0.2, gain: 0.12, duration: 0.3, attack: 0.01, decay: 0.12, release: 0.17 },
        { type: "sawtooth", freq: 225 + ds * 0.2, gain: 0.06, duration: 0.25, attack: 0.02, decay: 0.1, release: 0.13, detune: 25 },
      ],
    },

    // ── Curious: questioning ascending glissando ──
    curious: {
      totalDuration: 0.45,
      layers: [
        { type: "triangle", freq: 600 + ds * 0.7, gain: 0.14, duration: 0.3, attack: 0.02, decay: 0.12, release: 0.16, freqEnd: 900 + ds * 0.7 },
        { type: "sine", freq: 900 + ds * 0.7, gain: 0.06, duration: 0.25, attack: 0.03, decay: 0.1, release: 0.12, delay: 0.05, freqEnd: 1200 + ds * 0.7 },
      ],
    },

    // ── Sleepy: soft low breathing sound ──
    sleepy: {
      totalDuration: 0.8,
      layers: [
        { type: "sine", freq: 220 + ds * 0.2, gain: 0.06, duration: 0.7, attack: 0.2, decay: 0.3, release: 0.2, freqEnd: 200 + ds * 0.2, vibratoRate: 2, vibratoDepth: 8 },
      ],
    },

    // ── Love / Loving: warm harmonic chord ──
    loving: {
      totalDuration: 0.7,
      layers: [
        { type: "sine", freq: 523 + ds * 0.5, gain: 0.1, duration: 0.55, attack: 0.08, decay: 0.2, release: 0.27 },
        { type: "sine", freq: 659 + ds * 0.5, gain: 0.08, duration: 0.5, attack: 0.1, decay: 0.18, release: 0.22, delay: 0.03 },
        { type: "triangle", freq: 784 + ds * 0.5, gain: 0.05, duration: 0.45, attack: 0.12, decay: 0.15, release: 0.18, delay: 0.06 },
      ],
    },

    // ── Playful: bouncy staccato notes ──
    playful: {
      totalDuration: 0.6,
      layers: [
        { type: "triangle", freq: 784 + ds * 0.8, gain: 0.15, duration: 0.07, attack: 0.005, decay: 0.03, release: 0.035, noteCount: 3, noteGap: 0.1 },
        { type: "sine", freq: 1176 + ds * 0.8, gain: 0.06, duration: 0.06, attack: 0.005, decay: 0.025, release: 0.03, noteCount: 3, noteGap: 0.1, delay: 0.015 },
      ],
    },

    // ── Calm / Peaceful: gentle sustained pad ──
    peaceful: {
      totalDuration: 0.8,
      layers: [
        { type: "sine", freq: 392 + ds * 0.4, gain: 0.06, duration: 0.7, attack: 0.15, decay: 0.3, release: 0.25 },
        { type: "sine", freq: 588 + ds * 0.4, gain: 0.03, duration: 0.6, attack: 0.2, decay: 0.2, release: 0.2, delay: 0.05 },
      ],
    },

    dreamy: {
      totalDuration: 0.8,
      layers: [
        { type: "sine", freq: 440 + ds * 0.4, gain: 0.05, duration: 0.7, attack: 0.2, decay: 0.25, release: 0.25, vibratoRate: 3, vibratoDepth: 6 },
        { type: "sine", freq: 660 + ds * 0.4, gain: 0.03, duration: 0.6, attack: 0.25, decay: 0.2, release: 0.15, delay: 0.08 },
      ],
    },

    // ── Proud: confident two-tone fanfare ──
    proud: {
      totalDuration: 0.5,
      layers: [
        { type: "sine", freq: 659 + ds * 0.6, gain: 0.14, duration: 0.2, attack: 0.02, decay: 0.08, release: 0.1 },
        { type: "sine", freq: 880 + ds * 0.6, gain: 0.12, duration: 0.2, attack: 0.02, decay: 0.08, release: 0.1, delay: 0.15 },
      ],
    },

    // ── Shy: quiet tiny peep ──
    shy: {
      totalDuration: 0.4,
      layers: [
        { type: "sine", freq: 700 + ds * 0.5, gain: 0.05, duration: 0.2, attack: 0.04, decay: 0.08, release: 0.08, freqEnd: 650 + ds * 0.5 },
      ],
    },

    // ── Energetic: rapid high bounces ──
    energetic: {
      totalDuration: 0.5,
      layers: [
        { type: "triangle", freq: 880 + ds, gain: 0.16, duration: 0.06, attack: 0.005, decay: 0.025, release: 0.03, noteCount: 4, noteGap: 0.06 },
        { type: "sine", freq: 1320 + ds, gain: 0.06, duration: 0.05, attack: 0.005, decay: 0.02, release: 0.025, noteCount: 4, noteGap: 0.06, delay: 0.01 },
      ],
    },

    // ── Inspired: ascending sparkle ──
    inspired: {
      totalDuration: 0.55,
      layers: [
        { type: "sine", freq: 660 + ds * 0.7, gain: 0.13, duration: 0.15, attack: 0.01, decay: 0.06, release: 0.08, freqEnd: 880 + ds * 0.7 },
        { type: "triangle", freq: 990 + ds * 0.7, gain: 0.07, duration: 0.12, attack: 0.01, decay: 0.05, release: 0.06, delay: 0.12, freqEnd: 1320 + ds * 0.7 },
      ],
    },

    // ── Confused: wobbly uncertain tone ──
    confused: {
      totalDuration: 0.5,
      layers: [
        { type: "triangle", freq: 500 + ds * 0.5, gain: 0.1, duration: 0.35, attack: 0.03, decay: 0.15, release: 0.17, vibratoRate: 6, vibratoDepth: 25, freqEnd: 480 + ds * 0.5 },
      ],
    },

    // ── Mischievous: sneaky descending then ascending ──
    mischievous: {
      totalDuration: 0.5,
      layers: [
        { type: "triangle", freq: 800 + ds * 0.6, gain: 0.12, duration: 0.15, attack: 0.01, decay: 0.06, release: 0.08, freqEnd: 600 + ds * 0.6 },
        { type: "triangle", freq: 600 + ds * 0.6, gain: 0.12, duration: 0.15, attack: 0.01, decay: 0.06, release: 0.08, delay: 0.18, freqEnd: 900 + ds * 0.6 },
      ],
    },

    // ── Grateful: warm rising pair ──
    grateful: {
      totalDuration: 0.55,
      layers: [
        { type: "sine", freq: 523 + ds * 0.5, gain: 0.1, duration: 0.25, attack: 0.05, decay: 0.1, release: 0.1 },
        { type: "sine", freq: 659 + ds * 0.5, gain: 0.08, duration: 0.2, attack: 0.05, decay: 0.08, release: 0.07, delay: 0.2 },
      ],
    },

    // ── Tender: very soft warm tone ──
    tender: {
      totalDuration: 0.6,
      layers: [
        { type: "sine", freq: 440 + ds * 0.4, gain: 0.06, duration: 0.5, attack: 0.12, decay: 0.2, release: 0.18 },
        { type: "sine", freq: 554 + ds * 0.4, gain: 0.03, duration: 0.4, attack: 0.15, decay: 0.15, release: 0.1, delay: 0.05 },
      ],
    },

    // ── Thoughtful: single contemplative tone ──
    thoughtful: {
      totalDuration: 0.6,
      layers: [
        { type: "sine", freq: 392 + ds * 0.4, gain: 0.07, duration: 0.5, attack: 0.1, decay: 0.2, release: 0.2 },
      ],
    },

    // ── Focused: steady sharp tone ──
    focused: {
      totalDuration: 0.4,
      layers: [
        { type: "triangle", freq: 660 + ds * 0.5, gain: 0.08, duration: 0.3, attack: 0.02, decay: 0.12, release: 0.16 },
      ],
    },

    // ── Bored: flat low blip ──
    bored: {
      totalDuration: 0.4,
      layers: [
        { type: "sine", freq: 280 + ds * 0.2, gain: 0.05, duration: 0.3, attack: 0.05, decay: 0.15, release: 0.1, freqEnd: 260 + ds * 0.2 },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Playback engine
// ---------------------------------------------------------------------------

/**
 * Schedule a single oscillator layer on the given AudioContext.
 */
function scheduleLayer(
  ctx: AudioContext,
  destination: AudioNode,
  layer: OscLayer,
  masterVolume: number,
  noteIndex: number,
): void {
  const noteCount = layer.noteCount ?? 1;
  const noteGap = layer.noteGap ?? 0;
  const delay = layer.delay ?? 0;
  const attack = layer.attack ?? 0.01;
  const decay = layer.decay ?? 0.05;
  const release = layer.release ?? 0.05;

  for (let n = 0; n < noteCount; n++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = layer.type;
    const startFreq = layer.freq + (noteIndex + n) * (layer.freqMult ?? 0);
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.detune.value = layer.detune ?? 0;

    // Frequency slide (glissando)
    if (layer.freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(
        layer.freqEnd + (noteIndex + n) * (layer.freqMult ?? 0),
        ctx.currentTime + delay + n * (layer.duration + noteGap) + layer.duration,
      );
    }

    // Vibrato via LFO
    if (layer.vibratoRate && layer.vibratoDepth) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = layer.vibratoRate;
      lfoGain.gain.value = layer.vibratoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const lfoStart = ctx.currentTime + delay + n * (layer.duration + noteGap);
      lfo.start(lfoStart);
      lfo.stop(lfoStart + layer.duration);
    }

    // Gain envelope: attack -> peak -> decay -> sustain -> release
    const peakGain = layer.gain * masterVolume;
    const noteStart = ctx.currentTime + delay + n * (layer.duration + noteGap);
    const noteEnd = noteStart + layer.duration;

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.linearRampToValueAtTime(peakGain, noteStart + attack);
    gain.gain.linearRampToValueAtTime(peakGain * 0.7, noteStart + attack + decay);
    gain.gain.setValueAtTime(peakGain * 0.7, noteEnd - release);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(noteStart);
    osc.stop(noteEnd + 0.01); // small buffer to avoid click
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

/**
 * Get sound parameters for a given mood (legacy compat).
 * Returns null for moods without defined sounds.
 */
export function getEmotionSound(mood: string | null | undefined): EmotionSoundParams | null {
  if (!mood) return null;
  const recipes = makeRecipes(0);
  const recipe = recipes[mood];
  if (!recipe) return null;
  const first = recipe.layers[0];
  return {
    frequency: first.freq,
    waveform: first.type,
    duration: first.duration,
    noteCount: first.noteCount ?? 1,
    pitchSpread: 0,
    volume: first.gain,
    detune: first.detune ?? 0,
  };
}

/**
 * Play a creature emotion sound using Web Audio API.
 * Multi-oscillator synthesis with gain envelopes for each emotion.
 *
 * @param mood - Current creature mood
 * @param dnaModifier - 0..1 from DNA that shifts pitch (higher = brighter)
 * @param volume - Optional volume override (0-1). Falls back to stored preference.
 */
/**
 * Returns: duration of the sound in milliseconds (for mouth-sync), or 0 if not played.
 */
export function playEmotionSound(
  mood: string | null | undefined,
  dnaModifier = 0.5,
  volume?: number,
): number {
  if (!mood) return 0;
  if (typeof window === "undefined" || !window.AudioContext) return 0;

  // DNA modifier shifts pitch range: 0 = -100 cents, 0.5 = 0, 1 = +100 cents
  const dnaShift = (dnaModifier - 0.5) * 200;
  const recipes = makeRecipes(dnaShift);
  const recipe = recipes[mood];
  if (!recipe) return 0;

  const masterVolume = volume ?? getCreatureVoiceVolume();
  if (masterVolume <= 0) return 0;

  try {
    const ctx = new AudioContext();

    // Master gain for overall volume control
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    for (let i = 0; i < recipe.layers.length; i++) {
      scheduleLayer(ctx, masterGain, recipe.layers[i], masterVolume, i);
    }

    const durationMs = Math.round(recipe.totalDuration * 1000);

    // Cleanup AudioContext after all sounds finish
    setTimeout(
      () => {
        void ctx.close();
      },
      (recipe.totalDuration + 0.3) * 1000,
    );

    return durationMs;
  } catch {
    // Audio not available — silently ignore
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Debounce / gating
// ---------------------------------------------------------------------------

let lastPlayedMood: string | null = null;
let lastPlayedTime = 0;

/**
 * Check if an emotion sound should trigger.
 * Prevents repeated triggers for the same mood within a cooldown window.
 */
export function shouldPlayEmotionSound(mood: string | null | undefined): boolean {
  if (!mood) return false;
  const now = Date.now();
  // Don't replay same mood within 10 seconds
  if (mood === lastPlayedMood && now - lastPlayedTime < 10_000) return false;
  // Only play for moods that have sound recipes
  const recipes = makeRecipes(0);
  if (!recipes[mood]) return false;
  lastPlayedMood = mood;
  lastPlayedTime = now;
  return true;
}
