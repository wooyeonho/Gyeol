// ── Season / Battle Pass System ──────────────────────────────────────────────
// Client-side season progression with procedural monthly themes, a 50-tier
// reward track (free + premium), and localStorage-backed progress.

// ── Types ────────────────────────────────────────────────────────────────────

export interface Season {
  id: string;
  name: { ko: string; en: string };
  theme: string;
  startDate: string;
  endDate: string;
  rewards: SeasonReward[];
}

export interface SeasonReward {
  /** 1-50 */
  tier: number;
  xpRequired: number;
  freeReward: { type: string; value: string | number };
  premiumReward?: { type: string; value: string | number };
}

export interface SeasonProgress {
  seasonId: string;
  currentXp: number;
  currentTier: number;
  isPremium: boolean;
  claimedTiers: number[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "gyeol:season-progress";
const MAX_TIER = 50;
const BASE_XP_PER_TIER = 100;
const XP_GROWTH = 1.12; // exponential curve per tier

export const SEASON_THEMES: {
  month: number;
  theme: string;
  name: { ko: string; en: string };
}[] = [
  { month: 1, theme: "winter-dreams", name: { ko: "겨울 꿈", en: "Winter Dreams" } },
  { month: 2, theme: "spring-of-love", name: { ko: "사랑의 봄", en: "Spring of Love" } },
  { month: 3, theme: "blossom-festival", name: { ko: "꽃 축제", en: "Blossom Festival" } },
  { month: 4, theme: "rainy-melody", name: { ko: "비의 멜로디", en: "Rainy Melody" } },
  { month: 5, theme: "green-awakening", name: { ko: "초록 각성", en: "Green Awakening" } },
  { month: 6, theme: "summer-tide", name: { ko: "여름 물결", en: "Summer Tide" } },
  { month: 7, theme: "starlight-night", name: { ko: "별빛 밤", en: "Starlight Night" } },
  { month: 8, theme: "golden-harvest", name: { ko: "황금 수확", en: "Golden Harvest" } },
  { month: 9, theme: "autumn-wind", name: { ko: "가을 바람", en: "Autumn Wind" } },
  { month: 10, theme: "moonlit-path", name: { ko: "달빛 길", en: "Moonlit Path" } },
  { month: 11, theme: "first-frost", name: { ko: "첫 서리", en: "First Frost" } },
  { month: 12, theme: "miracle-snow", name: { ko: "기적의 눈", en: "Miracle Snow" } },
];

// ── Reward type pools ────────────────────────────────────────────────────────

const FREE_REWARD_TYPES = [
  { type: "coins", value: 50 },
  { type: "coins", value: 100 },
  { type: "xp-boost", value: "15min" },
  { type: "avatar-frame", value: "basic" },
  { type: "emoji-pack", value: "standard" },
  { type: "coins", value: 150 },
  { type: "title", value: "beginner" },
];

const PREMIUM_REWARD_TYPES = [
  { type: "skin", value: "exclusive" },
  { type: "coins", value: 300 },
  { type: "avatar-frame", value: "premium" },
  { type: "xp-boost", value: "60min" },
  { type: "emoji-pack", value: "rare" },
  { type: "title", value: "elite" },
  { type: "background", value: "animated" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function xpForTier(tier: number): number {
  return Math.floor(BASE_XP_PER_TIER * Math.pow(XP_GROWTH, tier - 1));
}

/** Deterministic pseudo-random based on seed */
function seededIndex(seed: number, length: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.abs(Math.floor((x - Math.floor(x)) * length));
}

function generateRewards(seasonSeed: number): SeasonReward[] {
  const rewards: SeasonReward[] = [];
  let cumulativeXp = 0;

  for (let tier = 1; tier <= MAX_TIER; tier++) {
    const tierXp = xpForTier(tier);
    cumulativeXp += tierXp;

    const freeIdx = seededIndex(seasonSeed + tier, FREE_REWARD_TYPES.length);
    const premIdx = seededIndex(seasonSeed + tier + 1000, PREMIUM_REWARD_TYPES.length);

    // Milestone tiers (every 10) get better rewards
    const isMilestone = tier % 10 === 0;
    const freeReward = isMilestone
      ? { type: "coins", value: 200 + tier * 10 }
      : { ...FREE_REWARD_TYPES[freeIdx] };

    const premiumReward = isMilestone
      ? { type: "legendary-skin", value: `season-${seasonSeed}-tier-${tier}` }
      : { ...PREMIUM_REWARD_TYPES[premIdx] };

    rewards.push({
      tier,
      xpRequired: cumulativeXp,
      freeReward,
      premiumReward,
    });
  }

  return rewards;
}

function getSeasonSeed(year: number, month: number): number {
  return year * 100 + month;
}

function loadProgress(): SeasonProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeasonProgress;
  } catch {
    return null;
  }
}

function saveProgress(progress: SeasonProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current month's season, procedurally generated.
 * Accepts an optional `now` date for testability.
 */
export function getCurrentSeason(now: Date = new Date()): Season {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const themeEntry = SEASON_THEMES[month - 1];
  const seed = getSeasonSeed(year, month);

  // Season runs from 1st to last day of the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  return {
    id: `season-${year}-${String(month).padStart(2, "0")}`,
    name: themeEntry.name,
    theme: themeEntry.theme,
    startDate,
    endDate,
    rewards: generateRewards(seed),
  };
}

/**
 * Returns the player's current season progress from localStorage.
 * If none exists or the season has changed, returns a fresh progress object.
 */
export function getSeasonProgress(now: Date = new Date()): SeasonProgress {
  const season = getCurrentSeason(now);
  const saved = loadProgress();

  if (saved && saved.seasonId === season.id) {
    return saved;
  }

  // New season or first visit — create fresh progress
  const fresh: SeasonProgress = {
    seasonId: season.id,
    currentXp: 0,
    currentTier: 0,
    isPremium: false,
    claimedTiers: [],
  };

  saveProgress(fresh);
  return fresh;
}

/**
 * Adds XP to the current season and checks for tier-ups.
 * Returns the updated progress.
 */
export function addSeasonXp(amount: number, now: Date = new Date()): SeasonProgress {
  if (amount <= 0) {
    return getSeasonProgress(now);
  }

  const season = getCurrentSeason(now);
  const progress = getSeasonProgress(now);

  progress.currentXp += amount;

  // Check tier ups
  for (const reward of season.rewards) {
    if (reward.tier > progress.currentTier && progress.currentXp >= reward.xpRequired) {
      progress.currentTier = reward.tier;
    }
  }

  // Cap at MAX_TIER
  if (progress.currentTier > MAX_TIER) {
    progress.currentTier = MAX_TIER;
  }

  saveProgress(progress);
  return progress;
}

/**
 * Claims a reward for the given tier.
 * Throws if the tier hasn't been reached or was already claimed.
 */
export function claimSeasonReward(
  tier: number,
  now: Date = new Date(),
): { reward: SeasonReward; newProgress: SeasonProgress } {
  const season = getCurrentSeason(now);
  const progress = getSeasonProgress(now);

  if (tier > progress.currentTier) {
    throw new Error(`Tier ${tier} not yet reached (current: ${progress.currentTier})`);
  }

  if (progress.claimedTiers.includes(tier)) {
    throw new Error(`Tier ${tier} already claimed`);
  }

  const reward = season.rewards.find((r) => r.tier === tier);
  if (!reward) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  progress.claimedTiers.push(tier);
  saveProgress(progress);

  return { reward, newProgress: progress };
}

/**
 * Returns the time remaining in the current season.
 */
export function getSeasonTimeRemaining(now: Date = new Date()): { days: number; hours: number } {
  const season = getCurrentSeason(now);
  const endDate = new Date(season.endDate);
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0 };
  }

  const totalHours = diff / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);

  return { days, hours };
}
