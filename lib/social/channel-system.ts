/**
 * Channel System — Discord-style social channels for creature communities.
 *
 * Channels are organized by creature species/type or topic. Each channel
 * supports bilingual names (ko/en), age-gating, and message reactions.
 */

import type { DominantType } from "@/lib/game/type-advantage";
import type { AgeGroup } from "@/lib/safety/age-gate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChannelType = "general" | "species" | "type" | "events";

export interface Channel {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  type: ChannelType;
  icon: string;
  memberCount: number;
  /** Minimum age group required to post. null = no restriction. */
  minAge: AgeGroup | null;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  creatureName: string;
  content: string;
  timestamp: string; // ISO date
  reactions: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

// ---------------------------------------------------------------------------
// Default Channels
// ---------------------------------------------------------------------------

export const DEFAULT_CHANNELS: Channel[] = [
  // General
  {
    id: "ch-general",
    name: { ko: "자유 게시판", en: "General" },
    description: {
      ko: "모든 존재가 자유롭게 소통하는 공간",
      en: "A space for all creatures to chat freely",
    },
    type: "general",
    icon: "\u{1F30D}",
    memberCount: 1024,
    minAge: null,
  },
  {
    id: "ch-introductions",
    name: { ko: "자기소개", en: "Introductions" },
    description: {
      ko: "새로 태어난 존재를 환영하세요",
      en: "Welcome newly born creatures",
    },
    type: "general",
    icon: "\u{1F44B}",
    memberCount: 876,
    minAge: null,
  },

  // Species-specific
  {
    id: "ch-species-ethereal",
    name: { ko: "에테리얼 종족", en: "Ethereal Species" },
    description: {
      ko: "빛과 안개의 존재들이 모이는 곳",
      en: "Gathering place for light and mist beings",
    },
    type: "species",
    icon: "\u2728",
    memberCount: 312,
    minAge: null,
  },
  {
    id: "ch-species-crystalline",
    name: { ko: "크리스탈 종족", en: "Crystalline Species" },
    description: {
      ko: "결정과 빙하의 존재들을 위한 채널",
      en: "Channel for crystal and glacier beings",
    },
    type: "species",
    icon: "\u{1F48E}",
    memberCount: 289,
    minAge: null,
  },
  {
    id: "ch-species-organic",
    name: { ko: "유기체 종족", en: "Organic Species" },
    description: {
      ko: "자연과 생명의 존재들이 교류하는 곳",
      en: "Where nature and life beings connect",
    },
    type: "species",
    icon: "\u{1F331}",
    memberCount: 405,
    minAge: null,
  },

  // Type-specific (by DominantType)
  {
    id: "ch-type-analytical",
    name: { ko: "분석형 라운지", en: "Analytical Lounge" },
    description: {
      ko: "논리와 분석을 사랑하는 존재들의 토론장",
      en: "Discussion hall for logic-loving creatures",
    },
    type: "type",
    icon: "\u{1F9E0}",
    memberCount: 198,
    minAge: null,
  },
  {
    id: "ch-type-emotional",
    name: { ko: "감정형 쉼터", en: "Emotional Haven" },
    description: {
      ko: "감정을 나누고 공감하는 안전한 공간",
      en: "A safe space to share feelings and empathize",
    },
    type: "type",
    icon: "\u{1F497}",
    memberCount: 267,
    minAge: null,
  },
  {
    id: "ch-type-creative",
    name: { ko: "창조형 아틀리에", en: "Creative Atelier" },
    description: {
      ko: "상상력과 창작물을 공유하는 곳",
      en: "Share imagination and creations",
    },
    type: "type",
    icon: "\u{1F3A8}",
    memberCount: 345,
    minAge: null,
  },
  {
    id: "ch-type-social",
    name: { ko: "사교형 광장", en: "Social Plaza" },
    description: {
      ko: "함께 어울리고 관계를 맺는 공간",
      en: "Mingle and build relationships",
    },
    type: "type",
    icon: "\u{1F91D}",
    memberCount: 432,
    minAge: null,
  },

  // Events
  {
    id: "ch-events-weekly",
    name: { ko: "주간 이벤트", en: "Weekly Events" },
    description: {
      ko: "매주 열리는 특별 이벤트 안내",
      en: "Weekly special event announcements",
    },
    type: "events",
    icon: "\u{1F389}",
    memberCount: 756,
    minAge: null,
  },
  {
    id: "ch-events-evolution",
    name: { ko: "진화 축제", en: "Evolution Ceremonies" },
    description: {
      ko: "존재들의 진화를 함께 축하하세요",
      en: "Celebrate creature evolutions together",
    },
    type: "events",
    icon: "\u{1F31F}",
    memberCount: 543,
    minAge: null,
  },
  {
    id: "ch-events-nightowl",
    name: { ko: "심야 토론", en: "Late Night Talks" },
    description: {
      ko: "성인 전용 심야 자유 토론",
      en: "Adult-only late night open discussion",
    },
    type: "events",
    icon: "\u{1F319}",
    memberCount: 189,
    minAge: "adult",
  },
];

// ---------------------------------------------------------------------------
// Channel type <-> DominantType mapping
// ---------------------------------------------------------------------------

const TYPE_CHANNEL_MAP: Record<DominantType, string> = {
  analytical: "ch-type-analytical",
  emotional: "ch-type-emotional",
  creative: "ch-type-creative",
  social: "ch-type-social",
  balanced: "ch-general", // balanced creatures fit everywhere
};

const SPECIES_CHANNEL_MAP: Record<string, string> = {
  ethereal: "ch-species-ethereal",
  crystalline: "ch-species-crystalline",
  organic: "ch-species-organic",
  // Species archetypes without a dedicated channel get recommended general
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Filter channels by their type category. */
export function getChannelsByType(type: ChannelType): Channel[] {
  return DEFAULT_CHANNELS.filter((ch) => ch.type === type);
}

/**
 * Get recommended channels for a creature based on its dominant type and species.
 * Always includes the general channel, the matching type channel, and any
 * species-specific channel whose archetype keyword appears in the species name.
 */
export function getRecommendedChannels(
  dominantType: DominantType,
  species: string,
): Channel[] {
  const ids = new Set<string>();

  // Always recommend general
  ids.add("ch-general");

  // Type channel
  const typeChannelId = TYPE_CHANNEL_MAP[dominantType];
  if (typeChannelId) ids.add(typeChannelId);

  // Species channel — match by archetype keyword in the species name
  const speciesLower = species.toLowerCase();
  for (const [keyword, channelId] of Object.entries(SPECIES_CHANNEL_MAP)) {
    if (speciesLower.includes(keyword)) {
      ids.add(channelId);
    }
  }

  // Events — always recommend weekly events
  ids.add("ch-events-weekly");

  return DEFAULT_CHANNELS.filter((ch) => ids.has(ch.id));
}

/**
 * Format a channel name for display based on locale.
 * Falls back to English if the locale is not Korean.
 */
export function formatChannelName(channel: Channel, locale: string): string {
  const isKo = locale === "ko" || locale.startsWith("ko-");
  return isKo ? channel.name.ko : channel.name.en;
}

/**
 * Check whether a user with the given age group can post in a channel.
 * Channels with minAge === null are open to all ages.
 * Otherwise the user's age group must meet or exceed the channel's requirement.
 */
export function canPostInChannel(channel: Channel, userAge: AgeGroup): boolean {
  if (channel.minAge === null) return true;

  const AGE_RANK: Record<AgeGroup, number> = {
    under_13: 0,
    teen: 1,
    adult: 2,
  };

  return AGE_RANK[userAge] >= AGE_RANK[channel.minAge];
}
