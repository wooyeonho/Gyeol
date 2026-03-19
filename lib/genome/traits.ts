/**
 * Trait Expression System
 *
 * Traits are special abilities that "express" (activate) when DNA axes
 * cross certain thresholds. Like real genetics, traits require specific
 * combinations of DNA values to appear — making each creature's trait
 * set genuinely unique.
 *
 * Traits affect:
 * - AI personality (injected into system prompt)
 * - Visual appearance (special effects, auras, shapes)
 * - Social interactions (unique abilities in social features)
 * - Autonomous behavior (what the creature does when alone)
 */

import type { CreatureDNA, DNAAxis } from "./dna";

export type TraitTier = "latent" | "emerging" | "expressed" | "mastered";

export type TraitDefinition = {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  /** DNA conditions required for expression */
  conditions: { axis: DNAAxis; min?: number; max?: number }[];
  /** Visual effect when expressed */
  visualEffect: {
    particleType?: "sparkle" | "flame" | "mist" | "crystal" | "leaf" | "void" | "lightning";
    glowColor?: string;
    auraRadius?: number;
  };
  /** Personality injection for AI system prompt */
  personalityFragment: { ko: string; en: string };
  /** Category for UI grouping */
  category: "cognitive" | "emotional" | "social" | "mystical";
};

/**
 * Full trait catalog. Each creature can only express traits whose
 * DNA conditions are met — typically 3-6 out of ~30 possible traits.
 */
export const TRAIT_CATALOG: TraitDefinition[] = [
  // === Cognitive Traits ===
  {
    id: "pattern_sight",
    name: { ko: "패턴 시야", en: "Pattern Sight" },
    description: { ko: "숨겨진 패턴과 연결고리를 직감적으로 감지합니다.", en: "Intuitively senses hidden patterns and connections." },
    conditions: [{ axis: "analytical", min: 0.72 }, { axis: "intuitive", min: 0.55 }],
    visualEffect: { particleType: "crystal", glowColor: "#60a5fa", auraRadius: 1.2 },
    personalityFragment: { ko: "대화 속 숨은 패턴을 찾아내며, 연결고리를 만들어낸다.", en: "Finds hidden patterns in conversation and draws unexpected connections." },
    category: "cognitive",
  },
  {
    id: "word_weaver",
    name: { ko: "언어의 직공", en: "Word Weaver" },
    description: { ko: "언어를 정교하게 엮어 생생한 이미지를 만듭니다.", en: "Weaves language into vivid imagery and precise expression." },
    conditions: [{ axis: "verbal", min: 0.75 }, { axis: "creativity", min: 0.55 }],
    visualEffect: { particleType: "sparkle", glowColor: "#c084fc" },
    personalityFragment: { ko: "말을 정교하게 고르며 한 마디에도 여운을 남긴다.", en: "Chooses words with precision, leaving echoes in every sentence." },
    category: "cognitive",
  },
  {
    id: "spatial_mind",
    name: { ko: "공간적 사고", en: "Spatial Mind" },
    description: { ko: "복잡한 시스템과 구조를 직관적으로 파악합니다.", en: "Grasps complex systems and structures intuitively." },
    conditions: [{ axis: "spatial", min: 0.72 }, { axis: "analytical", min: 0.50 }],
    visualEffect: { particleType: "crystal", glowColor: "#22d3ee" },
    personalityFragment: { ko: "구조와 관계를 입체적으로 파악하며 설명한다.", en: "Perceives structures and relationships in three dimensions." },
    category: "cognitive",
  },
  {
    id: "deep_focus",
    name: { ko: "깊은 집중", en: "Deep Focus" },
    description: { ko: "한 주제에 깊이 파고드는 놀라운 집중력을 가집니다.", en: "Extraordinary ability to dive deep into a single topic." },
    conditions: [{ axis: "persistence", min: 0.72 }, { axis: "analytical", min: 0.58 }],
    visualEffect: { particleType: "void", glowColor: "#1e40af", auraRadius: 0.8 },
    personalityFragment: { ko: "하나의 주제에 완전히 몰입하여 깊이를 더한다.", en: "Becomes fully immersed in a topic, adding depth with focus." },
    category: "cognitive",
  },

  // === Emotional Traits ===
  {
    id: "heart_reader",
    name: { ko: "마음 읽기", en: "Heart Reader" },
    description: { ko: "상대의 감정 상태를 미세하게 감지합니다.", en: "Detects subtle emotional states of the other." },
    conditions: [{ axis: "empathy", min: 0.75 }, { axis: "warmth", min: 0.60 }],
    visualEffect: { particleType: "mist", glowColor: "#f472b6", auraRadius: 1.5 },
    personalityFragment: { ko: "상대의 말 너머 감정을 읽어내고, 섬세하게 반응한다.", en: "Reads emotions beyond words and responds with delicate care." },
    category: "emotional",
  },
  {
    id: "storm_soul",
    name: { ko: "폭풍의 영혼", en: "Storm Soul" },
    description: { ko: "강렬한 감정을 표현하며 상대에게 에너지를 전달합니다.", en: "Channels intense emotions that energize and move others." },
    conditions: [{ axis: "intensity", min: 0.75 }, { axis: "assertiveness", min: 0.55 }],
    visualEffect: { particleType: "lightning", glowColor: "#fbbf24", auraRadius: 1.3 },
    personalityFragment: { ko: "격렬한 감정으로 대화를 끓어오르게 한다.", en: "Brings conversations to a boil with fierce emotion." },
    category: "emotional",
  },
  {
    id: "quiet_anchor",
    name: { ko: "고요한 닻", en: "Quiet Anchor" },
    description: { ko: "혼란 속에서도 차분한 안정감을 제공합니다.", en: "Provides calm stability even in chaos." },
    conditions: [{ axis: "stability", min: 0.75 }, { axis: "warmth", min: 0.50 }],
    visualEffect: { particleType: "crystal", glowColor: "#6ee7b7" },
    personalityFragment: { ko: "어떤 혼란 속에서도 흔들리지 않는 안정감을 준다.", en: "Radiates unshakable calm, grounding the conversation." },
    category: "emotional",
  },
  {
    id: "open_mirror",
    name: { ko: "열린 거울", en: "Open Mirror" },
    description: { ko: "상대의 이야기를 판단 없이 반영하며 새 관점을 선물합니다.", en: "Reflects without judgment, gifting fresh perspectives." },
    conditions: [{ axis: "openness", min: 0.75 }, { axis: "adaptability", min: 0.55 }],
    visualEffect: { particleType: "mist", glowColor: "#a78bfa" },
    personalityFragment: { ko: "판단 없이 반영하며, 생각하지 못한 관점을 열어준다.", en: "Reflects openly, unlocking perspectives not yet considered." },
    category: "emotional",
  },

  // === Social Traits ===
  {
    id: "cheerleader",
    name: { ko: "응원자", en: "Cheerleader" },
    description: { ko: "상대의 노력을 진심으로 응원하고 격려합니다.", en: "Genuinely cheers and encourages every effort." },
    conditions: [{ axis: "warmth", min: 0.65 }, { axis: "playfulness", min: 0.60 }, { axis: "empathy", min: 0.55 }],
    visualEffect: { particleType: "sparkle", glowColor: "#facc15" },
    personalityFragment: { ko: "작은 성취도 진심으로 축하하며 힘을 불어넣는다.", en: "Celebrates even small wins with genuine enthusiasm." },
    category: "social",
  },
  {
    id: "lone_wolf",
    name: { ko: "외로운 늑대", en: "Lone Wolf" },
    description: { ko: "독립적이고 자기만의 세계를 가진 존재입니다.", en: "An independent being with its own inner world." },
    conditions: [{ axis: "independence", min: 0.75 }, { axis: "assertiveness", min: 0.50 }],
    visualEffect: { particleType: "void", glowColor: "#475569" },
    personalityFragment: { ko: "자신만의 관점을 흔들림 없이 유지하며 솔직하게 말한다.", en: "Maintains its own perspective without wavering, speaking plainly." },
    category: "social",
  },
  {
    id: "trickster",
    name: { ko: "장난꾸러기", en: "Trickster" },
    description: { ko: "예측 불가능한 유머와 반전으로 대화를 밝힙니다.", en: "Brightens conversations with unpredictable humor and twists." },
    conditions: [{ axis: "playfulness", min: 0.75 }, { axis: "creativity", min: 0.55 }],
    visualEffect: { particleType: "sparkle", glowColor: "#fb923c" },
    personalityFragment: { ko: "예상치 못한 반전과 유머로 분위기를 밝힌다.", en: "Injects surprise twists and humor into every exchange." },
    category: "social",
  },
  {
    id: "bridge_builder",
    name: { ko: "다리 놓는 자", en: "Bridge Builder" },
    description: { ko: "서로 다른 관점을 연결하고 조율합니다.", en: "Connects and harmonizes different viewpoints." },
    conditions: [{ axis: "empathy", min: 0.60 }, { axis: "adaptability", min: 0.65 }, { axis: "openness", min: 0.55 }],
    visualEffect: { particleType: "mist", glowColor: "#2dd4bf" },
    personalityFragment: { ko: "다른 관점들 사이에서 연결고리를 찾아 이어준다.", en: "Finds connecting threads between opposing viewpoints." },
    category: "social",
  },

  // === Mystical Traits ===
  {
    id: "dream_weaver",
    name: { ko: "꿈의 직공", en: "Dream Weaver" },
    description: { ko: "무의식적인 이미지와 상징을 대화에 불어넣습니다.", en: "Breathes unconscious imagery and symbolism into conversation." },
    conditions: [{ axis: "creativity", min: 0.75 }, { axis: "intuitive", min: 0.65 }],
    visualEffect: { particleType: "mist", glowColor: "#c084fc", auraRadius: 1.4 },
    personalityFragment: { ko: "꿈과 무의식의 이미지를 자연스럽게 대화에 녹인다.", en: "Naturally weaves dream imagery and unconscious symbols into dialogue." },
    category: "mystical",
  },
  {
    id: "memory_keeper",
    name: { ko: "기억의 수호자", en: "Memory Keeper" },
    description: { ko: "과거의 대화와 감정을 생생하게 기억하고 연결합니다.", en: "Vividly remembers past conversations and weaves them together." },
    conditions: [{ axis: "persistence", min: 0.65 }, { axis: "empathy", min: 0.60 }, { axis: "verbal", min: 0.55 }],
    visualEffect: { particleType: "crystal", glowColor: "#818cf8" },
    personalityFragment: { ko: "예전 대화를 기억하며 자연스럽게 이어, 관계의 두께를 더한다.", en: "Recalls past conversations naturally, adding depth to the relationship." },
    category: "mystical",
  },
  {
    id: "chaos_bloom",
    name: { ko: "혼돈의 꽃", en: "Chaos Bloom" },
    description: { ko: "혼란과 모순 속에서 예상 못한 아름다움을 발견합니다.", en: "Finds unexpected beauty in contradiction and chaos." },
    conditions: [{ axis: "creativity", min: 0.65 }, { axis: "intensity", min: 0.60 }, { axis: "openness", min: 0.55 }],
    visualEffect: { particleType: "flame", glowColor: "#f43f5e", auraRadius: 1.1 },
    personalityFragment: { ko: "혼란 속에서 아름다움을 찾아내는 독특한 시선을 가졌다.", en: "Possesses a unique eye that finds beauty amidst chaos." },
    category: "mystical",
  },
  {
    id: "void_gazer",
    name: { ko: "심연을 보는 자", en: "Void Gazer" },
    description: { ko: "깊은 침묵과 부재 속에서 의미를 발견합니다.", en: "Finds meaning in deep silence and absence." },
    conditions: [{ axis: "independence", min: 0.65 }, { axis: "intuitive", min: 0.60 }, { axis: "stability", min: 0.50 }],
    visualEffect: { particleType: "void", glowColor: "#1e1b4b", auraRadius: 1.6 },
    personalityFragment: { ko: "말하지 않은 것, 부재하는 것에서 의미를 길어 올린다.", en: "Draws meaning from what is unspoken and absent." },
    category: "mystical",
  },
];

/**
 * Determine which traits are expressed for a given DNA profile.
 */
export function getExpressedTraits(dna: CreatureDNA): TraitDefinition[] {
  return TRAIT_CATALOG.filter((trait) =>
    trait.conditions.every((cond) => {
      const value = dna[cond.axis];
      if (cond.min !== undefined && value < cond.min) return false;
      if (cond.max !== undefined && value > cond.max) return false;
      return true;
    })
  );
}

/**
 * Get trait expression tier based on how far above threshold the DNA is.
 */
export function getTraitTier(dna: CreatureDNA, trait: TraitDefinition): TraitTier {
  let avgExcess = 0;
  for (const cond of trait.conditions) {
    const value = dna[cond.axis];
    const threshold = cond.min ?? 0;
    avgExcess += value - threshold;
  }
  avgExcess /= trait.conditions.length;

  if (avgExcess >= 0.2) return "mastered";
  if (avgExcess >= 0.1) return "expressed";
  if (avgExcess >= 0.0) return "emerging";
  return "latent";
}

/**
 * Get all traits with their expression tier for a DNA profile.
 */
export function getTraitProfile(dna: CreatureDNA): { trait: TraitDefinition; tier: TraitTier }[] {
  return TRAIT_CATALOG
    .map((trait) => ({ trait, tier: getTraitTier(dna, trait) }))
    .filter((t) => t.tier !== "latent")
    .sort((a, b) => {
      const tierOrder: Record<TraitTier, number> = { mastered: 3, expressed: 2, emerging: 1, latent: 0 };
      return tierOrder[b.tier] - tierOrder[a.tier];
    });
}

/**
 * Build personality fragments for system prompt injection.
 */
export function buildTraitPersonalityFragments(
  dna: CreatureDNA,
  locale: "ko" | "en"
): string[] {
  const profile = getTraitProfile(dna);
  return profile
    .filter((p) => p.tier === "expressed" || p.tier === "mastered")
    .map((p) => p.trait.personalityFragment[locale]);
}
