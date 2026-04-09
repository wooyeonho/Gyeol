/**
 * Creature sticker system — DNA-based custom emoji/stickers.
 * Each creature generates unique stickers based on their DNA profile.
 * Inspired by Discord custom emojis + KakaoTalk sticker packs.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export interface Sticker {
  id: string;
  emoji: string;
  label: { ko: string; en: string };
  mood: string;
  dnaAxis: string; // Which DNA axis this sticker emphasizes
  unlocked: boolean;
  rarity: "common" | "rare" | "epic";
}

export interface StickerPack {
  creatureName: string;
  stickers: Sticker[];
  totalUnlocked: number;
}

/** Base sticker templates — the emoji and mood are modified by DNA */
const STICKER_TEMPLATES: Array<{
  baseMood: string;
  baseEmoji: string;
  label: { ko: string; en: string };
  dnaAxis: string;
  threshold: number; // DNA value needed to unlock
  rarity: "common" | "rare" | "epic";
}> = [
  // Common — unlock easily
  { baseMood: "happy", baseEmoji: "😊", label: { ko: "행복", en: "Happy" }, dnaAxis: "warmth", threshold: 0.3, rarity: "common" },
  { baseMood: "excited", baseEmoji: "🤩", label: { ko: "신남", en: "Excited" }, dnaAxis: "intensity", threshold: 0.3, rarity: "common" },
  { baseMood: "sleepy", baseEmoji: "😴", label: { ko: "졸림", en: "Sleepy" }, dnaAxis: "stability", threshold: 0.3, rarity: "common" },
  { baseMood: "thinking", baseEmoji: "🤔", label: { ko: "생각 중", en: "Thinking" }, dnaAxis: "analytical", threshold: 0.3, rarity: "common" },
  { baseMood: "love", baseEmoji: "😍", label: { ko: "사랑", en: "Love" }, dnaAxis: "empathy", threshold: 0.3, rarity: "common" },
  { baseMood: "playful", baseEmoji: "😜", label: { ko: "장난", en: "Playful" }, dnaAxis: "playfulness", threshold: 0.3, rarity: "common" },
  { baseMood: "sad", baseEmoji: "😢", label: { ko: "슬픔", en: "Sad" }, dnaAxis: "openness", threshold: 0.3, rarity: "common" },
  { baseMood: "angry", baseEmoji: "😤", label: { ko: "화남", en: "Angry" }, dnaAxis: "assertiveness", threshold: 0.3, rarity: "common" },
  // Rare — need higher DNA values
  { baseMood: "genius", baseEmoji: "🧠", label: { ko: "천재", en: "Genius" }, dnaAxis: "analytical", threshold: 0.7, rarity: "rare" },
  { baseMood: "creative", baseEmoji: "🎨", label: { ko: "영감", en: "Inspired" }, dnaAxis: "creativity", threshold: 0.7, rarity: "rare" },
  { baseMood: "zen", baseEmoji: "🧘", label: { ko: "명상", en: "Zen" }, dnaAxis: "stability", threshold: 0.7, rarity: "rare" },
  { baseMood: "fierce", baseEmoji: "🔥", label: { ko: "불타오름", en: "Fierce" }, dnaAxis: "intensity", threshold: 0.7, rarity: "rare" },
  { baseMood: "mystic", baseEmoji: "🔮", label: { ko: "신비", en: "Mystic" }, dnaAxis: "intuitive", threshold: 0.7, rarity: "rare" },
  { baseMood: "brave", baseEmoji: "⚔️", label: { ko: "용감", en: "Brave" }, dnaAxis: "assertiveness", threshold: 0.7, rarity: "rare" },
  { baseMood: "curious", baseEmoji: "🔍", label: { ko: "호기심", en: "Curious" }, dnaAxis: "curiosity", threshold: 0.65, rarity: "rare" },
  { baseMood: "social", baseEmoji: "🤝", label: { ko: "사교", en: "Social" }, dnaAxis: "empathy", threshold: 0.65, rarity: "rare" },
  // Epic — need very high DNA values
  { baseMood: "enlightened", baseEmoji: "✨", label: { ko: "깨달음", en: "Enlightened" }, dnaAxis: "adaptability", threshold: 0.85, rarity: "epic" },
  { baseMood: "legendary", baseEmoji: "🌟", label: { ko: "전설", en: "Legendary" }, dnaAxis: "persistence", threshold: 0.85, rarity: "epic" },
  { baseMood: "cosmic", baseEmoji: "🌌", label: { ko: "우주적", en: "Cosmic" }, dnaAxis: "spatial", threshold: 0.85, rarity: "epic" },
  { baseMood: "eloquent", baseEmoji: "📜", label: { ko: "달변", en: "Eloquent" }, dnaAxis: "verbal", threshold: 0.85, rarity: "epic" },
  { baseMood: "independent", baseEmoji: "🦅", label: { ko: "독립", en: "Independent" }, dnaAxis: "independence", threshold: 0.85, rarity: "epic" },
  { baseMood: "chaotic", baseEmoji: "🌀", label: { ko: "혼돈", en: "Chaotic" }, dnaAxis: "playfulness", threshold: 0.9, rarity: "epic" },
];

/** Generate sticker pack for a creature based on its DNA */
export function generateStickerPack(creatureName: string, dna: CreatureDNA): StickerPack {
  const stickers: Sticker[] = STICKER_TEMPLATES.map((template) => {
    const dnaValue = dna[template.dnaAxis as keyof CreatureDNA] ?? 0.5;
    const unlocked = dnaValue >= template.threshold;

    return {
      id: `sticker_${template.baseMood}`,
      emoji: template.baseEmoji,
      label: template.label,
      mood: template.baseMood,
      dnaAxis: template.dnaAxis,
      unlocked,
      rarity: template.rarity,
    };
  });

  return {
    creatureName,
    stickers,
    totalUnlocked: stickers.filter((s) => s.unlocked).length,
  };
}

/** Get stickers by rarity */
export function getStickersByRarity(pack: StickerPack, rarity: Sticker["rarity"]): Sticker[] {
  return pack.stickers.filter((s) => s.rarity === rarity);
}

/** Get unlocked stickers only */
export function getUnlockedStickers(pack: StickerPack): Sticker[] {
  return pack.stickers.filter((s) => s.unlocked);
}

/** Get sticker unlock progress */
export function getStickerProgress(pack: StickerPack): { unlocked: number; total: number; percentage: number } {
  const total = pack.stickers.length;
  const unlocked = pack.totalUnlocked;
  return { unlocked, total, percentage: Math.round((unlocked / total) * 100) };
}

/** Get the most fitting sticker for a given mood */
export function getStickerForMood(pack: StickerPack, mood: string): Sticker | null {
  const exact = pack.stickers.find((s) => s.mood === mood && s.unlocked);
  if (exact) return exact;
  // Fallback to any unlocked sticker
  const unlocked = getUnlockedStickers(pack);
  return unlocked.length > 0 ? unlocked[Math.floor(Math.random() * unlocked.length)] : null;
}
