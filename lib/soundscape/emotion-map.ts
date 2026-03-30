/**
 * Emotion-to-sound mapping for the reactive soundscape.
 *
 * Maps all 28 creature moods (from CREATURE_MOODS) to musical parameters
 * that the Soundscape component can consume. Each mood gets a unique
 * combination of base note, tempo, instruments, and scale to create
 * a distinctive auditory signature.
 */

import type { CreatureMood } from "@/lib/evolution/personality";
import { CREATURE_MOODS } from "@/lib/evolution/personality";

export type EmotionProfile = {
  mood: string;
  base_note: string;
  tempo: number;
  instruments: string[];
  /** Scale degrees used for the melodic sequence */
  scale: string[];
  /** Volume modifier 0..1 (default 0.7) */
  volume: number;
};

type ProfileData = Omit<EmotionProfile, "mood">;

const EMOTION_PROFILES: Record<CreatureMood, ProfileData> = {
  // ═══ Positive / High-energy ═══
  joyful: {
    base_note: "G4", tempo: 100, instruments: ["piano"], volume: 0.75,
    scale: ["G4", "B4", "D5", "E5", "D5", "B4", "A4", "G4"],
  },
  playful: {
    base_note: "A4", tempo: 115, instruments: ["bell", "piano"], volume: 0.7,
    scale: ["A4", "C#5", "E5", "A5", "E5", "C#5", "B4", "A4"],
  },
  excited: {
    base_note: "E4", tempo: 130, instruments: ["piano"], volume: 0.8,
    scale: ["E4", "G#4", "B4", "E5", "D5", "B4", "G#4", "E4"],
  },
  proud: {
    base_note: "D4", tempo: 88, instruments: ["piano", "pad"], volume: 0.72,
    scale: ["D4", "F#4", "A4", "D5", "A4", "F#4", "E4", "D4"],
  },
  inspired: {
    base_note: "F4", tempo: 95, instruments: ["bell", "pad"], volume: 0.7,
    scale: ["F4", "A4", "C5", "E5", "C5", "A4", "G4", "F4"],
  },
  loving: {
    base_note: "Ab4", tempo: 72, instruments: ["pad", "choir"], volume: 0.65,
    scale: ["Ab4", "C5", "Eb5", "Ab5", "Eb5", "C5", "Bb4", "Ab4"],
  },
  grateful: {
    base_note: "Eb4", tempo: 78, instruments: ["bell"], volume: 0.65,
    scale: ["Eb4", "G4", "Bb4", "Eb5", "Bb4", "G4", "F4", "Eb4"],
  },
  mischievous: {
    base_note: "Bb4", tempo: 120, instruments: ["bell", "piano"], volume: 0.72,
    scale: ["Bb4", "D5", "F5", "Ab5", "F5", "D5", "C5", "Bb4"],
  },

  // ═══ Calm / Neutral ═══
  curious: {
    base_note: "D4", tempo: 80, instruments: ["bell"], volume: 0.65,
    scale: ["D4", "F#4", "A4", "B4", "A4", "G4", "F#4", "D4"],
  },
  thoughtful: {
    base_note: "E4", tempo: 60, instruments: ["pad"], volume: 0.55,
    scale: ["E4", "G4", "B4", "A4", "G4", "F#4", "E4", "D4"],
  },
  dreamy: {
    base_note: "Db4", tempo: 55, instruments: ["pad", "choir"], volume: 0.5,
    scale: ["Db4", "F4", "Ab4", "Db5", "Ab4", "F4", "Eb4", "Db4"],
  },
  focused: {
    base_note: "C4", tempo: 70, instruments: ["pad"], volume: 0.5,
    scale: ["C4", "E4", "G4", "C5", "G4", "E4", "D4", "C4"],
  },
  peaceful: {
    base_note: "C4", tempo: 55, instruments: ["pad"], volume: 0.45,
    scale: ["C4", "E4", "G4", "A4", "G4", "E4", "C4", "B3"],
  },
  tender: {
    base_note: "F4", tempo: 62, instruments: ["pad", "choir"], volume: 0.55,
    scale: ["F4", "A4", "C5", "D5", "C5", "A4", "G4", "F4"],
  },

  // ═══ Negative / Low-energy ═══
  melancholy: {
    base_note: "A3", tempo: 50, instruments: ["pad", "choir"], volume: 0.5,
    scale: ["A3", "C4", "E4", "D4", "C4", "B3", "A3", "G3"],
  },
  sad: {
    base_note: "D4", tempo: 48, instruments: ["pad"], volume: 0.45,
    scale: ["D4", "F4", "A4", "G4", "F4", "E4", "D4", "C4"],
  },
  lonely: {
    base_note: "B3", tempo: 52, instruments: ["bell", "pad"], volume: 0.45,
    scale: ["B3", "D4", "F#4", "E4", "D4", "C#4", "B3", "A3"],
  },
  angry: {
    base_note: "E3", tempo: 140, instruments: ["piano"], volume: 0.85,
    scale: ["E3", "G3", "Bb3", "E4", "Bb3", "G3", "F3", "E3"],
  },
  frustrated: {
    base_note: "G3", tempo: 110, instruments: ["piano"], volume: 0.78,
    scale: ["G3", "Bb3", "D4", "F4", "D4", "Bb3", "A3", "G3"],
  },
  scared: {
    base_note: "C#4", tempo: 95, instruments: ["bell"], volume: 0.55,
    scale: ["C#4", "E4", "G4", "Bb4", "G4", "E4", "D4", "C#4"],
  },
  shy: {
    base_note: "F#4", tempo: 58, instruments: ["bell"], volume: 0.4,
    scale: ["F#4", "A4", "C#5", "B4", "A4", "G#4", "F#4", "E4"],
  },
  jealous: {
    base_note: "Bb3", tempo: 90, instruments: ["piano", "pad"], volume: 0.68,
    scale: ["Bb3", "Db4", "F4", "Ab4", "F4", "Db4", "C4", "Bb3"],
  },

  // ═══ Reactive ═══
  surprised: {
    base_note: "C5", tempo: 105, instruments: ["bell", "piano"], volume: 0.75,
    scale: ["C5", "E5", "G5", "C6", "G5", "E5", "D5", "C5"],
  },
  confused: {
    base_note: "F#3", tempo: 65, instruments: ["bell"], volume: 0.55,
    scale: ["F#3", "A3", "C4", "Eb4", "C4", "A3", "G#3", "F#3"],
  },
  bored: {
    base_note: "G3", tempo: 45, instruments: ["pad"], volume: 0.35,
    scale: ["G3", "Bb3", "D4", "C4", "Bb3", "A3", "G3", "F3"],
  },
  energetic: {
    base_note: "E4", tempo: 135, instruments: ["piano", "bell"], volume: 0.82,
    scale: ["E4", "G#4", "B4", "E5", "D5", "B4", "G#4", "E4"],
  },
  sleepy: {
    base_note: "Eb3", tempo: 40, instruments: ["pad"], volume: 0.3,
    scale: ["Eb3", "G3", "Bb3", "Ab3", "G3", "F3", "Eb3", "D3"],
  },

  // ═══ Fallback ═══
  neutral: {
    base_note: "C4", tempo: 65, instruments: ["pad"], volume: 0.55,
    scale: ["C4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"],
  },
};

/**
 * Map a CreatureMood string to its sound profile key.
 * Falls back to "neutral" for unknown moods.
 */
function resolveProfileKey(mood: string): CreatureMood {
  if ((CREATURE_MOODS as readonly string[]).includes(mood)) return mood as CreatureMood;
  // Legacy/alias mappings
  if (mood === "happy") return "joyful";
  if (mood === "calm" || mood === "serene") return "peaceful";
  if (mood === "reflective" || mood === "contemplative") return "thoughtful";
  return "neutral";
}

/**
 * Derive an emotion mood from agent state signals.
 *
 * @param vitality  0–1 normalised vitality
 * @param trust     0–1 trust coefficient
 * @param recentTone  optional latest chat sentiment hint ("positive" | "negative" | "neutral")
 * @param creatureMood  optional direct mood string from agent_state.mood
 */
export function deriveEmotionMood(
  vitality: number,
  trust: number,
  recentTone?: "positive" | "negative" | "neutral" | null,
  creatureMood?: string | null,
): CreatureMood {
  // If we have a direct creature mood, prefer it
  if (creatureMood) return resolveProfileKey(creatureMood);
  // Fallback to vitality/trust heuristics
  if (recentTone === "negative" && vitality < 0.4) return "melancholy";
  if (recentTone === "positive" && vitality > 0.7) return "joyful";
  if (vitality > 0.8 && trust > 0.7) return "energetic";
  if (trust > 0.6 && vitality > 0.5) return "curious";
  if (vitality < 0.3) return "thoughtful";
  return "peaceful";
}

/**
 * Get the full sound profile for a mood.
 * Applies energy multiplier to tempo and volume for conversation-driven reactivity.
 */
export function getEmotionSoundProfile(mood: string, energyMult = 1): EmotionProfile {
  const key = resolveProfileKey(mood);
  const profile = EMOTION_PROFILES[key];
  return {
    mood: key,
    ...profile,
    tempo: Math.round(profile.tempo * (0.9 + energyMult * 0.2)), // energy boosts tempo slightly
    volume: Math.min(1, profile.volume * (0.85 + energyMult * 0.3)), // energy boosts volume
  };
}
