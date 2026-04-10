/**
 * Season Pass system — 8-week progressive reward track (Battle Pass model).
 *
 * Each season has 40 tiers of rewards. Players earn XP through:
 * - Daily logins, chat conversations, care actions, challenges
 * - Free track: every tier unlocks a small reward
 * - Premium track: every tier unlocks the premium reward in addition
 *
 * Seasons run for exactly 8 weeks (56 days). A new season starts
 * automatically after the previous one ends.
 */

export type SeasonTier = {
  tier: number; // 1–40
  xpRequired: number; // cumulative XP to reach this tier
  freeReward: SeasonReward;
  premiumReward: SeasonReward;
};

export type SeasonRewardType =
  | "coins"
  | "mystery_box"
  | "cosmetic"
  | "evolution_points"
  | "xp_boost"
  | "exclusive_title";

export interface SeasonReward {
  type: SeasonRewardType;
  amount: number;
  label: { ko: string; en: string };
  icon: string;
  /** Only exclusive rewards have rarity */
  rarity?: "rare" | "epic" | "legendary";
}

export interface Season {
  id: string;
  name: { ko: string; en: string };
  theme: string; // e.g. "봄 축제", "여름 탐험"
  themeColor: string; // e.g. "#f59e0b"
  startDate: Date;
  endDate: Date; // startDate + 56 days
  tiers: SeasonTier[];
}

export interface SeasonProgress {
  seasonId: string;
  currentXp: number;
  currentTier: number;
  isPremium: boolean;
  claimedTiers: number[]; // tier numbers already claimed
  lastUpdated: Date;
}

// ── XP per action ──────────────────────────────────────────────────
export const SEASON_XP = {
  daily_login: 10,
  chat_message: 2,
  care_action: 5,
  challenge_complete: 25,
  social_post: 8,
  streak_milestone: 50,
  mystery_box_open: 3,
} as const;

export type SeasonXpAction = keyof typeof SEASON_XP;

// ── XP curve (logarithmic — early tiers fast, later tiers slower) ──
function tierXp(tier: number): number {
  return Math.floor(100 + tier * 35 + Math.pow(tier, 1.4) * 8);
}

function cumulativeXp(targetTier: number): number {
  let total = 0;
  for (let i = 1; i <= targetTier; i++) total += tierXp(i);
  return total;
}

// ── Season theme catalog ───────────────────────────────────────────
const SEASON_THEMES = [
  { name: { ko: "봄의 탄생", en: "Spring Awakening" }, theme: "🌸", themeColor: "#f472b6" },
  { name: { ko: "여름 탐험", en: "Summer Expedition" }, theme: "🌊", themeColor: "#06b6d4" },
  { name: { ko: "가을의 지혜", en: "Autumn Wisdom" }, theme: "🍂", themeColor: "#f59e0b" },
  { name: { ko: "겨울 꿈", en: "Winter Dream" }, theme: "❄️", themeColor: "#818cf8" },
  { name: { ko: "별빛 여정", en: "Starlight Journey" }, theme: "✨", themeColor: "#a855f7" },
  { name: { ko: "대지의 힘", en: "Earth Power" }, theme: "🌿", themeColor: "#22c55e" },
];

// ── Generate tiers for a season ────────────────────────────────────
function generateTiers(themeColor: string, themeIcon: string): SeasonTier[] {
  return Array.from({ length: 40 }, (_, i) => {
    const tier = i + 1;
    const isMilestone = tier % 5 === 0;
    const isLast = tier === 40;

    const freeReward: SeasonReward = isMilestone
      ? { type: "mystery_box", amount: 1, label: { ko: "미스터리 박스", en: "Mystery Box" }, icon: "🎁" }
      : { type: "coins", amount: 20 + tier * 5, label: { ko: `${20 + tier * 5} 코인`, en: `${20 + tier * 5} Coins` }, icon: "🪙" };

    const premiumReward: SeasonReward = isLast
      ? {
          type: "exclusive_title",
          amount: 1,
          label: { ko: "시즌 챔피언", en: "Season Champion" },
          icon: themeIcon,
          rarity: "legendary",
        }
      : isMilestone
      ? {
          type: "cosmetic",
          amount: 1,
          label: { ko: "시즌 코스메틱", en: "Season Cosmetic" },
          icon: themeIcon,
          rarity: tier >= 30 ? "epic" : "rare",
        }
      : {
          type: "evolution_points",
          amount: 10 + tier * 3,
          label: { ko: `${10 + tier * 3} 진화 포인트`, en: `${10 + tier * 3} Evolution Points` },
          icon: "⚡",
        };

    return {
      tier,
      xpRequired: cumulativeXp(tier),
      freeReward,
      premiumReward,
    };
  });
}

// ── Get current season based on current date ───────────────────────
export function getCurrentSeason(): Season {
  const now = new Date();
  // Season index: one 8-week cycle per entry in SEASON_THEMES, cycling
  const weeksSinceEpoch = Math.floor(
    (now.getTime() - new Date("2025-01-06").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const seasonIndex = Math.floor(weeksSinceEpoch / 8);
  const theme = SEASON_THEMES[seasonIndex % SEASON_THEMES.length];

  const seasonStart = new Date("2025-01-06");
  seasonStart.setTime(
    seasonStart.getTime() + seasonIndex * 8 * 7 * 24 * 60 * 60 * 1000
  );
  const seasonEnd = new Date(seasonStart.getTime() + 56 * 24 * 60 * 60 * 1000);

  return {
    id: `season-${seasonIndex}`,
    name: theme.name,
    theme: theme.theme,
    themeColor: theme.themeColor,
    startDate: seasonStart,
    endDate: seasonEnd,
    tiers: generateTiers(theme.themeColor, theme.theme),
  };
}

// ── Progress helpers ───────────────────────────────────────────────

const STORAGE_KEY = "season-progress";

export function getSeasonProgress(): SeasonProgress {
  if (typeof localStorage === "undefined") {
    return defaultProgress(getCurrentSeason().id);
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SeasonProgress;
      // Reset if new season
      if (parsed.seasonId !== getCurrentSeason().id) {
        return defaultProgress(getCurrentSeason().id);
      }
      return { ...parsed, lastUpdated: new Date(parsed.lastUpdated) };
    }
  } catch { /* ignore */ }
  return defaultProgress(getCurrentSeason().id);
}

function defaultProgress(seasonId: string): SeasonProgress {
  return {
    seasonId,
    currentXp: 0,
    currentTier: 0,
    isPremium: false,
    claimedTiers: [],
    lastUpdated: new Date(),
  };
}

export function saveSeasonProgress(progress: SeasonProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

/** Award XP for a user action. Returns updated progress. */
export function awardSeasonXp(action: SeasonXpAction): SeasonProgress {
  const progress = getSeasonProgress();
  const season = getCurrentSeason();
  const xp = SEASON_XP[action];

  progress.currentXp += xp;

  // Recalculate tier
  let newTier = 0;
  for (const t of season.tiers) {
    if (progress.currentXp >= t.xpRequired) newTier = t.tier;
    else break;
  }
  progress.currentTier = newTier;
  progress.lastUpdated = new Date();

  saveSeasonProgress(progress);
  return progress;
}

/** Returns rewards ready to claim (unlocked but not yet claimed). */
export function getPendingRewards(progress: SeasonProgress): SeasonTier[] {
  const season = getCurrentSeason();
  return season.tiers.filter(
    (t) =>
      t.tier <= progress.currentTier && !progress.claimedTiers.includes(t.tier)
  );
}

/** Mark a tier as claimed. */
export function claimTierReward(tier: number): SeasonProgress {
  const progress = getSeasonProgress();
  if (!progress.claimedTiers.includes(tier)) {
    progress.claimedTiers.push(tier);
    saveSeasonProgress(progress);
  }
  return progress;
}

/** Days remaining in the current season. */
export function daysRemaining(): number {
  const season = getCurrentSeason();
  return Math.max(
    0,
    Math.ceil((season.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );
}
