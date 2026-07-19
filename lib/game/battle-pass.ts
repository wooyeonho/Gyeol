// ── Battle Pass System ──────────────────────────────────────────────────────
// A 30-tier monthly battle pass (one tier per day of the month).
// Players earn BP XP from daily activities: completing challenges, sending
// messages, and caring for their creature. Each tier has a free reward and a
// premium reward.

// ── Types ────────────────────────────────────────────────────────────────────

export type BattlePassRewardType =
  | "coins"
  | "emoji-dust"
  | "streak-freeze"
  | "xp-boost"
  | "avatar-frame"
  | "rare-emoji-pack"
  | "exclusive-accessory"
  | "legendary-item"
  | "special-title"
  | "animated-background"
  | "profile-banner"
  | "evolution-stones"
  | "creature-outfit"
  | "legendary-creature-skin";

export interface BattlePassReward {
  type: BattlePassRewardType;
  label: { ko: string; en: string };
  value: string | number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface BattlePassTier {
  /** 1-30 */
  tier: number;
  /** Cumulative XP needed to reach this tier */
  xpRequired: number;
  freeReward: BattlePassReward;
  premiumReward: BattlePassReward;
}

export interface DailyActivities {
  /** Number of daily challenges completed (0-3) */
  challengesCompleted: number;
  /** Total messages sent today */
  messagesSent: number;
  /** Number of creature care actions (feed, play, groom, etc.) */
  creatureCareActions: number;
  /** Whether the user completed all 3 daily challenges ("perfect day") */
  perfectDay: boolean;
  /** Streak day count (consecutive login days) */
  streakDays: number;
}

export interface BattlePassProgress {
  tier: number;
  /** Progress 0..1 toward the next tier */
  progress: number;
  /** XP remaining until the next tier (0 when maxed) */
  xpToNext: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_BP_TIER = 30;
const BASE_XP = 80;
const XP_PER_TIER_INCREMENT = 12;

// XP rewards for activities
const XP_PER_CHALLENGE = 30;
const XP_PERFECT_DAY_BONUS = 40;
const XP_PER_MESSAGE = 2;
const XP_MAX_MESSAGE_XP = 40; // cap: 20 messages worth
const XP_PER_CREATURE_CARE = 10;
const XP_MAX_CREATURE_CARE_XP = 30; // cap: 3 actions
const XP_STREAK_BONUS_THRESHOLD = 7;
const XP_STREAK_BONUS = 15;

// ── XP curve ────────────────────────────────────────────────────────────────

 

function _xpForTier(tier: number): number {
  // Linear growth: tier 1 = 80, tier 2 = 92, tier 3 = 104 ...
  return BASE_XP + XP_PER_TIER_INCREMENT * (tier - 1);
}

function cumulativeXpForTier(tier: number): number {
  // Sum of arithmetic sequence: n/2 * (2a + (n-1)d)
  return Math.floor(
    (tier / 2) * (2 * BASE_XP + (tier - 1) * XP_PER_TIER_INCREMENT),
  );
}

// ── Free track rewards ──────────────────────────────────────────────────────

const FREE_REWARDS: BattlePassReward[] = [
  /* 1  */ { type: "coins", label: { ko: "50 코인", en: "50 Coins" }, value: 50, rarity: "common" },
  /* 2  */ { type: "emoji-dust", label: { ko: "이모지 가루 x5", en: "Emoji Dust x5" }, value: 5, rarity: "common" },
  /* 3  */ { type: "coins", label: { ko: "75 코인", en: "75 Coins" }, value: 75, rarity: "common" },
  /* 4  */ { type: "xp-boost", label: { ko: "XP 부스트 15분", en: "XP Boost 15min" }, value: "15min", rarity: "uncommon" },
  /* 5  */ { type: "streak-freeze", label: { ko: "스트릭 프리즈", en: "Streak Freeze" }, value: 1, rarity: "uncommon" },
  /* 6  */ { type: "coins", label: { ko: "100 코인", en: "100 Coins" }, value: 100, rarity: "common" },
  /* 7  */ { type: "emoji-dust", label: { ko: "이모지 가루 x10", en: "Emoji Dust x10" }, value: 10, rarity: "common" },
  /* 8  */ { type: "coins", label: { ko: "100 코인", en: "100 Coins" }, value: 100, rarity: "common" },
  /* 9  */ { type: "xp-boost", label: { ko: "XP 부스트 30분", en: "XP Boost 30min" }, value: "30min", rarity: "uncommon" },
  /* 10 */ { type: "coins", label: { ko: "200 코인", en: "200 Coins" }, value: 200, rarity: "uncommon" },
  /* 11 */ { type: "emoji-dust", label: { ko: "이모지 가루 x10", en: "Emoji Dust x10" }, value: 10, rarity: "common" },
  /* 12 */ { type: "coins", label: { ko: "125 코인", en: "125 Coins" }, value: 125, rarity: "common" },
  /* 13 */ { type: "streak-freeze", label: { ko: "스트릭 프리즈", en: "Streak Freeze" }, value: 1, rarity: "uncommon" },
  /* 14 */ { type: "coins", label: { ko: "150 코인", en: "150 Coins" }, value: 150, rarity: "common" },
  /* 15 */ { type: "emoji-dust", label: { ko: "이모지 가루 x20", en: "Emoji Dust x20" }, value: 20, rarity: "uncommon" },
  /* 16 */ { type: "coins", label: { ko: "150 코인", en: "150 Coins" }, value: 150, rarity: "common" },
  /* 17 */ { type: "xp-boost", label: { ko: "XP 부스트 30분", en: "XP Boost 30min" }, value: "30min", rarity: "uncommon" },
  /* 18 */ { type: "coins", label: { ko: "175 코인", en: "175 Coins" }, value: 175, rarity: "common" },
  /* 19 */ { type: "emoji-dust", label: { ko: "이모지 가루 x15", en: "Emoji Dust x15" }, value: 15, rarity: "common" },
  /* 20 */ { type: "coins", label: { ko: "300 코인", en: "300 Coins" }, value: 300, rarity: "rare" },
  /* 21 */ { type: "streak-freeze", label: { ko: "스트릭 프리즈 x2", en: "Streak Freeze x2" }, value: 2, rarity: "uncommon" },
  /* 22 */ { type: "coins", label: { ko: "200 코인", en: "200 Coins" }, value: 200, rarity: "common" },
  /* 23 */ { type: "emoji-dust", label: { ko: "이모지 가루 x20", en: "Emoji Dust x20" }, value: 20, rarity: "uncommon" },
  /* 24 */ { type: "xp-boost", label: { ko: "XP 부스트 60분", en: "XP Boost 60min" }, value: "60min", rarity: "rare" },
  /* 25 */ { type: "coins", label: { ko: "250 코인", en: "250 Coins" }, value: 250, rarity: "uncommon" },
  /* 26 */ { type: "emoji-dust", label: { ko: "이모지 가루 x25", en: "Emoji Dust x25" }, value: 25, rarity: "uncommon" },
  /* 27 */ { type: "coins", label: { ko: "250 코인", en: "250 Coins" }, value: 250, rarity: "uncommon" },
  /* 28 */ { type: "streak-freeze", label: { ko: "스트릭 프리즈 x2", en: "Streak Freeze x2" }, value: 2, rarity: "uncommon" },
  /* 29 */ { type: "coins", label: { ko: "300 코인", en: "300 Coins" }, value: 300, rarity: "rare" },
  /* 30 */ { type: "coins", label: { ko: "500 코인", en: "500 Coins" }, value: 500, rarity: "rare" },
];

// ── Premium track rewards ───────────────────────────────────────────────────

const PREMIUM_REWARDS: BattlePassReward[] = [
  /* 1  */ { type: "rare-emoji-pack", label: { ko: "레어 이모지 팩", en: "Rare Emoji Pack" }, value: "spring-set", rarity: "rare" },
  /* 2  */ { type: "coins", label: { ko: "200 코인", en: "200 Coins" }, value: 200, rarity: "uncommon" },
  /* 3  */ { type: "exclusive-accessory", label: { ko: "반짝이 목걸이", en: "Sparkle Necklace" }, value: "sparkle-necklace", rarity: "rare" },
  /* 4  */ { type: "evolution-stones", label: { ko: "진화석 x3", en: "Evolution Stones x3" }, value: 3, rarity: "rare" },
  /* 5  */ { type: "special-title", label: { ko: "칭호: 탐험가", en: "Title: Explorer" }, value: "explorer", rarity: "rare" },
  /* 6  */ { type: "creature-outfit", label: { ko: "크리처 나비 날개", en: "Creature Butterfly Wings" }, value: "butterfly-wings", rarity: "rare" },
  /* 7  */ { type: "coins", label: { ko: "350 코인", en: "350 Coins" }, value: 350, rarity: "uncommon" },
  /* 8  */ { type: "exclusive-accessory", label: { ko: "무지개 왕관", en: "Rainbow Crown" }, value: "rainbow-crown", rarity: "epic" },
  /* 9  */ { type: "rare-emoji-pack", label: { ko: "레어 이모지 팩 II", en: "Rare Emoji Pack II" }, value: "ocean-set", rarity: "rare" },
  /* 10 */ { type: "legendary-item", label: { ko: "전설 별빛 구슬", en: "Legendary Starlight Orb" }, value: "starlight-orb", rarity: "legendary" },
  /* 11 */ { type: "animated-background", label: { ko: "애니메이션 배경: 벚꽃", en: "Animated BG: Cherry Blossom" }, value: "cherry-blossom", rarity: "epic" },
  /* 12 */ { type: "evolution-stones", label: { ko: "진화석 x5", en: "Evolution Stones x5" }, value: 5, rarity: "rare" },
  /* 13 */ { type: "exclusive-accessory", label: { ko: "달빛 귀걸이", en: "Moonlight Earrings" }, value: "moonlight-earrings", rarity: "rare" },
  /* 14 */ { type: "coins", label: { ko: "500 코인", en: "500 Coins" }, value: 500, rarity: "rare" },
  /* 15 */ { type: "special-title", label: { ko: "칭호: 수호자", en: "Title: Guardian" }, value: "guardian", rarity: "epic" },
  /* 16 */ { type: "creature-outfit", label: { ko: "크리처 용 갑옷", en: "Creature Dragon Armor" }, value: "dragon-armor", rarity: "epic" },
  /* 17 */ { type: "rare-emoji-pack", label: { ko: "에픽 이모지 팩", en: "Epic Emoji Pack" }, value: "galaxy-set", rarity: "epic" },
  /* 18 */ { type: "exclusive-accessory", label: { ko: "황금 날개", en: "Golden Wings" }, value: "golden-wings", rarity: "epic" },
  /* 19 */ { type: "evolution-stones", label: { ko: "진화석 x8", en: "Evolution Stones x8" }, value: 8, rarity: "epic" },
  /* 20 */ { type: "legendary-item", label: { ko: "전설 용의 심장", en: "Legendary Dragon Heart" }, value: "dragon-heart", rarity: "legendary" },
  /* 21 */ { type: "profile-banner", label: { ko: "프리미엄 배너: 오로라", en: "Premium Banner: Aurora" }, value: "aurora", rarity: "epic" },
  /* 22 */ { type: "exclusive-accessory", label: { ko: "크리스탈 지팡이", en: "Crystal Staff" }, value: "crystal-staff", rarity: "epic" },
  /* 23 */ { type: "coins", label: { ko: "750 코인", en: "750 Coins" }, value: 750, rarity: "rare" },
  /* 24 */ { type: "creature-outfit", label: { ko: "크리처 피닉스 깃털", en: "Creature Phoenix Plumage" }, value: "phoenix-plumage", rarity: "legendary" },
  /* 25 */ { type: "special-title", label: { ko: "칭호: 전설의 용사", en: "Title: Legendary Hero" }, value: "legendary-hero", rarity: "legendary" },
  /* 26 */ { type: "animated-background", label: { ko: "애니메이션 배경: 은하수", en: "Animated BG: Milky Way" }, value: "milky-way", rarity: "legendary" },
  /* 27 */ { type: "evolution-stones", label: { ko: "진화석 x12", en: "Evolution Stones x12" }, value: 12, rarity: "epic" },
  /* 28 */ { type: "exclusive-accessory", label: { ko: "시간의 가면", en: "Mask of Time" }, value: "mask-of-time", rarity: "legendary" },
  /* 29 */ { type: "coins", label: { ko: "1000 코인", en: "1000 Coins" }, value: 1000, rarity: "epic" },
  /* 30 */ { type: "legendary-creature-skin", label: { ko: "전설 크리처 스킨: 천상의 빛", en: "Legendary Creature Skin: Celestial Light" }, value: "celestial-light", rarity: "legendary" },
];

// ── Tier table (generated once) ─────────────────────────────────────────────

function buildTiers(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];
  for (let i = 0; i < MAX_BP_TIER; i++) {
    tiers.push({
      tier: i + 1,
      xpRequired: cumulativeXpForTier(i + 1),
      freeReward: FREE_REWARDS[i],
      premiumReward: PREMIUM_REWARDS[i],
    });
  }
  return tiers;
}

export const BATTLE_PASS_TIERS: BattlePassTier[] = buildTiers();

// ── Public functions ────────────────────────────────────────────────────────

/**
 * Calculate BP XP earned from a set of daily activities.
 *
 * Sources:
 * - Each completed daily challenge: 30 XP
 * - Perfect day bonus (all 3 done): +40 XP
 * - Messages sent: 2 XP each, capped at 40 XP (20 messages)
 * - Creature care actions: 10 XP each, capped at 30 XP (3 actions)
 * - 7+ day streak bonus: +15 XP
 */
export function calculateBattlePassXP(activities: DailyActivities): number {
  let xp = 0;

  // Challenges
  const challenges = Math.max(0, Math.min(3, activities.challengesCompleted));
  xp += challenges * XP_PER_CHALLENGE;

  // Perfect day bonus
  if (activities.perfectDay && challenges >= 3) {
    xp += XP_PERFECT_DAY_BONUS;
  }

  // Messages
  const msgXp = Math.max(0, activities.messagesSent) * XP_PER_MESSAGE;
  xp += Math.min(msgXp, XP_MAX_MESSAGE_XP);

  // Creature care
  const careXp = Math.max(0, activities.creatureCareActions) * XP_PER_CREATURE_CARE;
  xp += Math.min(careXp, XP_MAX_CREATURE_CARE_XP);

  // Streak bonus
  if (activities.streakDays >= XP_STREAK_BONUS_THRESHOLD) {
    xp += XP_STREAK_BONUS;
  }

  return xp;
}

/**
 * Returns the current tier (1-30) for the given total cumulative XP.
 * Returns 0 if no tier has been reached yet.
 */
export function getCurrentTier(totalXP: number): number {
  let tier = 0;
  for (const t of BATTLE_PASS_TIERS) {
    if (totalXP >= t.xpRequired) {
      tier = t.tier;
    } else {
      break;
    }
  }
  return tier;
}

/**
 * Returns the rewards available at a given tier.
 * Free players get only the free reward; premium players get both.
 */
export function getRewardsForTier(
  tier: number,
  isPremium: boolean,
): BattlePassReward[] {
  if (tier < 1 || tier > MAX_BP_TIER) return [];

  const entry = BATTLE_PASS_TIERS[tier - 1];
  const rewards: BattlePassReward[] = [entry.freeReward];

  if (isPremium) {
    rewards.push(entry.premiumReward);
  }

  return rewards;
}

/**
 * Returns all unclaimed rewards up to (and including) the player's current tier.
 * `claimedTiers` is the list of tier numbers the player has already claimed.
 */
export function getUnclaimedRewards(
  currentTier: number,
  claimedTiers: number[],
  isPremium: boolean,
): BattlePassReward[] {
  const claimed = new Set(claimedTiers);
  const rewards: BattlePassReward[] = [];

  for (let t = 1; t <= Math.min(currentTier, MAX_BP_TIER); t++) {
    if (!claimed.has(t)) {
      rewards.push(...getRewardsForTier(t, isPremium));
    }
  }

  return rewards;
}

/**
 * Returns the player's overall battle pass progress.
 */
export function getTotalBPProgress(totalXP: number): BattlePassProgress {
  const tier = getCurrentTier(totalXP);

  if (tier >= MAX_BP_TIER) {
    return { tier: MAX_BP_TIER, progress: 1, xpToNext: 0 };
  }

  const currentThreshold = tier === 0 ? 0 : BATTLE_PASS_TIERS[tier - 1].xpRequired;
  const nextThreshold = BATTLE_PASS_TIERS[tier].xpRequired;
  const range = nextThreshold - currentThreshold;

  const progress = range > 0 ? (totalXP - currentThreshold) / range : 0;
  const xpToNext = nextThreshold - totalXP;

  return {
    tier,
    progress: Math.min(1, Math.max(0, progress)),
    xpToNext: Math.max(0, xpToNext),
  };
}
