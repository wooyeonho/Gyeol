/**
 * Emotion-to-sound mapping for the reactive soundscape.
 *
 * Maps agent emotional states (derived from vitality, trust, recent chat tone)
 * to musical parameters that the Soundscape component can consume.
 */

export type EmotionProfile = {
  mood: "calm" | "curious" | "joyful" | "melancholy" | "energetic" | "reflective";
  base_note: string;
  tempo: number;
  instruments: string[];
  /** Scale degrees used for the melodic sequence */
  scale: string[];
};

const EMOTION_PROFILES: Record<EmotionProfile["mood"], Omit<EmotionProfile, "mood">> = {
  calm: {
    base_note: "C4",
    tempo: 60,
    instruments: ["pad"],
    scale: ["C4", "E4", "G4", "A4", "G4", "E4", "C4", "B3"],
  },
  curious: {
    base_note: "D4",
    tempo: 80,
    instruments: ["bell"],
    scale: ["D4", "F#4", "A4", "B4", "A4", "G4", "F#4", "D4"],
  },
  joyful: {
    base_note: "G4",
    tempo: 100,
    instruments: ["piano"],
    scale: ["G4", "B4", "D5", "E5", "D5", "B4", "A4", "G4"],
  },
  melancholy: {
    base_note: "A3",
    tempo: 55,
    instruments: ["pad", "choir"],
    scale: ["A3", "C4", "E4", "D4", "C4", "B3", "A3", "G3"],
  },
  energetic: {
    base_note: "E4",
    tempo: 120,
    instruments: ["piano"],
    scale: ["E4", "G#4", "B4", "E5", "D5", "B4", "G#4", "E4"],
  },
  reflective: {
    base_note: "F4",
    tempo: 65,
    instruments: ["bell", "pad"],
    scale: ["F4", "A4", "C5", "Bb4", "A4", "G4", "F4", "E4"],
  },
};

/**
 * Derive an emotion mood from agent state signals.
 *
 * @param vitality  0–1 normalised vitality
 * @param trust     0–1 trust coefficient
 * @param recentTone  optional latest chat sentiment hint ("positive" | "negative" | "neutral")
 */
export function deriveEmotionMood(
  vitality: number,
  trust: number,
  recentTone?: "positive" | "negative" | "neutral" | null,
): EmotionProfile["mood"] {
  if (recentTone === "negative" && vitality < 0.4) return "melancholy";
  if (recentTone === "positive" && vitality > 0.7) return "joyful";
  if (vitality > 0.8 && trust > 0.7) return "energetic";
  if (trust > 0.6 && vitality > 0.5) return "curious";
  if (vitality < 0.3) return "reflective";
  return "calm";
}

export function getEmotionSoundProfile(mood: EmotionProfile["mood"]): EmotionProfile {
  const profile = EMOTION_PROFILES[mood];
  return { mood, ...profile };
}
