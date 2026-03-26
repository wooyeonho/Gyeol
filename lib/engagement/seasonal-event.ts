/**
 * Seasonal / Limited-Time Event framework.
 *
 * Creates urgency through time-limited content. This is the proven model
 * from every top-grossing mobile game (Genshin, Pokemon GO, etc.)
 *
 * Events have:
 * - Start/end dates (creates FOMO)
 * - Exclusive rewards only available during the event
 * - Community goals (collective progress bar)
 * - Thematic visual overlays
 */

export type EventType = "seasonal" | "community" | "flash" | "collab";

export interface SeasonalEvent {
  id: string;
  type: EventType;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
  theme_color: string;
  start_date: string;
  end_date: string;
  rewards: EventReward[];
  community_goal?: CommunityGoal;
}

export interface EventReward {
  tier: number;
  requirement: { type: string; value: number };
  reward: {
    coins?: number;
    evolution_points?: number;
    exclusive_title?: string;
    exclusive_skin?: string;
    mystery_box_rarity?: string;
  };
  label: { ko: string; en: string };
}

export interface CommunityGoal {
  description: { ko: string; en: string };
  target: number;
  current: number;
  reward_all: {
    coins?: number;
    evolution_points?: number;
    exclusive_title?: string;
  };
}

export interface EventProgress {
  event_id: string;
  user_id: string;
  points: number;
  claimed_tiers: number[];
}

// ── Event Templates ──

export function createSpringEvent(year: number): SeasonalEvent {
  return {
    id: `spring_bloom_${year}`,
    type: "seasonal",
    label: { ko: "봄의 꽃피움", en: "Spring Bloom" },
    description: {
      ko: "봄의 에너지로 생명체를 성장시키세요! 대화할수록 꽃이 핍니다.",
      en: "Grow your creature with spring energy! Flowers bloom with each conversation.",
    },
    icon: "🌸",
    theme_color: "#f472b6",
    start_date: `${year}-03-20`,
    end_date: `${year}-04-19`,
    rewards: [
      {
        tier: 1,
        requirement: { type: "messages", value: 30 },
        reward: { coins: 50 },
        label: { ko: "새싹", en: "Sprout" },
      },
      {
        tier: 2,
        requirement: { type: "messages", value: 100 },
        reward: { coins: 150, exclusive_skin: "cherry_blossom" },
        label: { ko: "꽃봉오리", en: "Bud" },
      },
      {
        tier: 3,
        requirement: { type: "messages", value: 300 },
        reward: { coins: 300, evolution_points: 15, exclusive_title: "Spring Guardian" },
        label: { ko: "만개", en: "Full Bloom" },
      },
    ],
    community_goal: {
      description: {
        ko: "전체 유저가 100만 메시지를 달성하면 모두에게 보상!",
        en: "If all users reach 1M messages, everyone gets a reward!",
      },
      target: 1_000_000,
      current: 0,
      reward_all: { coins: 100, exclusive_title: "Bloom Pioneer" },
    },
  };
}

export function createSummerEvent(year: number): SeasonalEvent {
  return {
    id: `summer_heat_${year}`,
    type: "seasonal",
    label: { ko: "여름의 열기", en: "Summer Heat" },
    description: {
      ko: "뜨거운 여름! 스트릭을 유지하면 불꽃이 타오릅니다.",
      en: "Hot summer! Keep your streak and the flames grow higher.",
    },
    icon: "☀️",
    theme_color: "#fb923c",
    start_date: `${year}-06-21`,
    end_date: `${year}-07-20`,
    rewards: [
      {
        tier: 1,
        requirement: { type: "streak_days", value: 5 },
        reward: { coins: 40 },
        label: { ko: "불씨", en: "Ember" },
      },
      {
        tier: 2,
        requirement: { type: "streak_days", value: 14 },
        reward: { coins: 120, mystery_box_rarity: "epic" },
        label: { ko: "화염", en: "Blaze" },
      },
      {
        tier: 3,
        requirement: { type: "streak_days", value: 30 },
        reward: { coins: 400, evolution_points: 20, exclusive_title: "Summer Inferno" },
        label: { ko: "태양", en: "Solar" },
      },
    ],
  };
}

export function createAutumnEvent(year: number): SeasonalEvent {
  return {
    id: `autumn_harvest_${year}`,
    type: "seasonal",
    label: { ko: "가을 수확", en: "Autumn Harvest" },
    description: {
      ko: "소셜 활동으로 수확의 계절을 축하하세요!",
      en: "Celebrate the harvest season with social activities!",
    },
    icon: "🍂",
    theme_color: "#d97706",
    start_date: `${year}-09-22`,
    end_date: `${year}-10-21`,
    rewards: [
      {
        tier: 1,
        requirement: { type: "social_interactions", value: 10 },
        reward: { coins: 50 },
        label: { ko: "수확", en: "Harvest" },
      },
      {
        tier: 2,
        requirement: { type: "social_interactions", value: 50 },
        reward: { coins: 200, exclusive_skin: "golden_leaf" },
        label: { ko: "풍요", en: "Abundance" },
      },
      {
        tier: 3,
        requirement: { type: "social_interactions", value: 100 },
        reward: { coins: 500, evolution_points: 25, exclusive_title: "Harvest Master" },
        label: { ko: "수확의 왕", en: "Harvest King" },
      },
    ],
  };
}

export function createWinterEvent(year: number): SeasonalEvent {
  return {
    id: `winter_miracle_${year}`,
    type: "seasonal",
    label: { ko: "겨울의 기적", en: "Winter Miracle" },
    description: {
      ko: "선물을 주고받으며 기적의 겨울을 보내세요!",
      en: "Exchange gifts and create winter miracles!",
    },
    icon: "❄️",
    theme_color: "#60a5fa",
    start_date: `${year}-12-21`,
    end_date: `${year + 1}-01-19`,
    rewards: [
      {
        tier: 1,
        requirement: { type: "gifts_sent", value: 3 },
        reward: { coins: 60 },
        label: { ko: "산타", en: "Santa" },
      },
      {
        tier: 2,
        requirement: { type: "gifts_sent", value: 10 },
        reward: { coins: 200, mystery_box_rarity: "legendary" },
        label: { ko: "선물의 달인", en: "Gift Master" },
      },
      {
        tier: 3,
        requirement: { type: "gifts_sent", value: 25 },
        reward: { coins: 600, evolution_points: 30, exclusive_title: "Winter Miracle" },
        label: { ko: "기적", en: "Miracle" },
      },
    ],
    community_goal: {
      description: {
        ko: "전체 유저가 10만 개의 선물을 보내면 모두에게 보상!",
        en: "If all users send 100K gifts, everyone gets a reward!",
      },
      target: 100_000,
      current: 0,
      reward_all: { coins: 200, exclusive_title: "Miracle Maker" },
    },
  };
}

// ── Utility ──

export function isEventActive(event: SeasonalEvent, now = new Date()): boolean {
  const start = new Date(event.start_date + "T00:00:00Z");
  const end = new Date(event.end_date + "T23:59:59Z");
  return now >= start && now <= end;
}

export function getEventTimeRemaining(event: SeasonalEvent, now = new Date()): {
  days: number;
  hours: number;
  expired: boolean;
} {
  const end = new Date(event.end_date + "T23:59:59Z");
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  return {
    days: Math.floor(diff / (24 * 3600000)),
    hours: Math.floor((diff % (24 * 3600000)) / 3600000),
    expired: false,
  };
}

export function getCurrentSeason(now = new Date()): "spring" | "summer" | "autumn" | "winter" {
  const month = now.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

export function getActiveSeasonalEvent(now = new Date()): SeasonalEvent | null {
  const year = now.getFullYear();
  const events = [
    createSpringEvent(year),
    createSummerEvent(year),
    createAutumnEvent(year),
    createWinterEvent(year),
    createWinterEvent(year - 1), // Winter event crosses year boundary (Dec Y-1 → Jan Y)
  ];

  return events.find((e) => isEventActive(e, now)) ?? null;
}
