/**
 * Map the free-form `mood` string stored on `AgentState` into one of the
 * six `EmotionTone` values used by the world-class AI orchestrator and
 * the LivingPresenceBeacon. Anything unknown collapses to `calm` so the
 * beacon always has a valid value.
 */

import type { EmotionTone } from "@/lib/ai/world-class-orchestrator";

const MAP: Record<string, EmotionTone> = {
  calm: "calm",
  neutral: "calm",
  peaceful: "calm",
  content: "calm",
  joyful: "joyful",
  happy: "joyful",
  energetic: "joyful",
  excited: "joyful",
  playful: "joyful",
  melancholy: "melancholic",
  melancholic: "melancholic",
  sad: "melancholic",
  sorrowful: "melancholic",
  grieving: "melancholic",
  anxious: "anxious",
  worried: "anxious",
  scared: "anxious",
  terrified: "anxious",
  angry: "anxious",
  curious: "curious",
  inquisitive: "curious",
  wondering: "curious",
  alert: "curious",
  tender: "tender",
  loving: "tender",
  affectionate: "tender",
  warm: "tender",
  cozy: "tender",
};

export function moodToEmotionTone(mood: string | null | undefined): EmotionTone {
  if (!mood) return "calm";
  const key = mood.trim().toLowerCase();
  return MAP[key] ?? "calm";
}
