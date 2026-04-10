// ── League / Tier System ────────────────────────────────────────────────────
// Duolingo-style league system with weekly promotion/demotion.
// Points accumulate from daily challenges, streak days, and messages sent.
// Weekly reset: top 30% promoted, bottom 10% demoted, rest stay.

// ── Types ────────────────────────────────────────────────────────────────────

export type Tier = "bronze" | "silver" | "gold" | "diamond" | "master" | "legend";

export interface TierConfig {
  tier: Tier;
  label: { ko: string; en: string };
  color: string;
  icon: string;
  pointThreshold: number;
}

export interface LeaguePointBreakdown {
  dailyChallenges: number;
  streakDays: number;
  messagesSent: number;
  total: number;
}

export type PromotionStatus = "promoted" | "demoted" | "stay";

export interface LeagueState {
  tier: Tier;
  points: number;
  weeklyPoints: number;
  weekId: string;
  rank: number;           // simulated rank within the tier (1-based)
  totalParticipants: number;
}

export interface LeagueProgress {
  currentTier: Tier;
  nextTier: Tier | null;
  currentPoints: number;
  pointsForNextTier: number;
  progressPercent: number; // 0..100
  promotionZone: boolean;  // top 30%
  demotionZone: boolean;   // bottom 10%
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "gyeol:league-state";
const STORAGE_WEEK_KEY = "gyeol:league-week";

/** Points awarded per activity type */
export const POINT_VALUES = {
  dailyChallenge: 15,
  streakDay: 10,
  messageSent: 2,
} as const;

/** Promotion: top 30%; Demotion: bottom 10% */
export const PROMOTION_PERCENT = 0.3;
export const DEMOTION_PERCENT = 0.1;

export const TIERS_ORDERED: Tier[] = [
  "bronze",
  "silver",
  "gold",
  "diamond",
  "master",
  "legend",
];

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  bronze: {
    tier: "bronze",
    label: { ko: "브론즈", en: "Bronze" },
    color: "#cd7f32",
    icon: "🥉",
    pointThreshold: 0,
  },
  silver: {
    tier: "silver",
    label: { ko: "실버", en: "Silver" },
    color: "#c0c0c0",
    icon: "🥈",
    pointThreshold: 100,
  },
  gold: {
    tier: "gold",
    label: { ko: "골드", en: "Gold" },
    color: "#ffd700",
    icon: "🥇",
    pointThreshold: 300,
  },
  diamond: {
    tier: "diamond",
    label: { ko: "다이아몬드", en: "Diamond" },
    color: "#b9f2ff",
    icon: "💎",
    pointThreshold: 600,
  },
  master: {
    tier: "master",
    label: { ko: "마스터", en: "Master" },
    color: "#9b59b6",
    icon: "👑",
    pointThreshold: 1000,
  },
  legend: {
    tier: "legend",
    label: { ko: "레전드", en: "Legend" },
    color: "#ff4500",
    icon: "🔥",
    pointThreshold: 1800,
  },
};

// ── Internal Helpers ─────────────────────────────────────────────────────────

export function getWeekId(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function tierIndex(tier: Tier): number {
  return TIERS_ORDERED.indexOf(tier);
}

function nextTier(tier: Tier): Tier | null {
  const idx = tierIndex(tier);
  return idx < TIERS_ORDERED.length - 1 ? TIERS_ORDERED[idx + 1] : null;
}

function prevTier(tier: Tier): Tier | null {
  const idx = tierIndex(tier);
  return idx > 0 ? TIERS_ORDERED[idx - 1] : null;
}

/** Deterministic simulated rank from points (lower = better) */
function simulateRank(points: number): number {
  return Math.max(1, Math.floor(50 - points / 50));
}

/** Simulated total participants per tier */
function simulateParticipants(tier: Tier): number {
  const base: Record<Tier, number> = {
    bronze: 200,
    silver: 150,
    gold: 100,
    diamond: 60,
    master: 30,
    legend: 15,
  };
  return base[tier];
}

// ── Storage ──────────────────────────────────────────────────────────────────

function loadState(): LeagueState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LeagueState;
  } catch {
    return null;
  }
}

function saveState(state: LeagueState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadWeekId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_WEEK_KEY);
}

function saveWeekId(weekId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_WEEK_KEY, weekId);
}

function createDefaultState(now: Date = new Date()): LeagueState {
  return {
    tier: "bronze",
    points: 0,
    weeklyPoints: 0,
    weekId: getWeekId(now),
    rank: 50,
    totalParticipants: simulateParticipants("bronze"),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate league points from activity counts.
 * Points come from: daily challenges completed, streak days, messages sent.
 */
export function calculateLeaguePoints(activities: {
  dailyChallenges?: number;
  streakDays?: number;
  messagesSent?: number;
}): LeaguePointBreakdown {
  const dailyChallenges = Math.max(0, activities.dailyChallenges ?? 0) * POINT_VALUES.dailyChallenge;
  const streakDays = Math.max(0, activities.streakDays ?? 0) * POINT_VALUES.streakDay;
  const messagesSent = Math.max(0, activities.messagesSent ?? 0) * POINT_VALUES.messageSent;
  return {
    dailyChallenges,
    streakDays,
    messagesSent,
    total: dailyChallenges + streakDays + messagesSent,
  };
}

/**
 * Determine which tier a given point total falls into.
 */
export function getCurrentTier(points: number): Tier {
  let result: Tier = "bronze";
  for (const tier of TIERS_ORDERED) {
    if (points >= TIER_CONFIG[tier].pointThreshold) {
      result = tier;
    }
  }
  return result;
}

/**
 * Get the current league state. Auto-resets weekly points if a new week starts.
 */
export function getLeagueState(now: Date = new Date()): LeagueState {
  const currentWeek = getWeekId(now);
  const savedWeek = loadWeekId();

  if (savedWeek !== currentWeek) {
    // New week: preserve tier and total points, reset weekly points
    const prev = loadState();
    const tier = prev?.tier ?? "bronze";
    const points = prev?.points ?? 0;
    const state: LeagueState = {
      tier,
      points,
      weeklyPoints: 0,
      weekId: currentWeek,
      rank: simulateRank(points),
      totalParticipants: simulateParticipants(tier),
    };
    saveState(state);
    saveWeekId(currentWeek);
    return state;
  }

  const saved = loadState();
  if (saved) return saved;

  const fresh = createDefaultState(now);
  saveState(fresh);
  saveWeekId(currentWeek);
  return fresh;
}

/**
 * Add points to the league state (from completed activities).
 */
export function addLeaguePoints(points: number, now: Date = new Date()): LeagueState {
  if (points <= 0) return getLeagueState(now);

  const state = getLeagueState(now);
  state.points += points;
  state.weeklyPoints += points;
  state.rank = simulateRank(state.points);
  state.totalParticipants = simulateParticipants(state.tier);

  saveState(state);
  return state;
}

/**
 * Determine promotion/demotion status based on rank percentile within tier.
 * - Top 30% -> promoted
 * - Bottom 10% -> demoted
 * - Otherwise -> stay
 *
 * Also applies any tier changes from crossing point thresholds.
 */
export function getPromotionStatus(now: Date = new Date()): {
  status: PromotionStatus;
  previousTier: Tier;
  currentTier: Tier;
} {
  const state = getLeagueState(now);
  const previousTier = state.tier;

  // Point-based tier check first
  const pointTier = getCurrentTier(state.points);
  const pointIdx = tierIndex(pointTier);
  const currentIdx = tierIndex(state.tier);

  // If points alone qualify for a higher tier, promote
  if (pointIdx > currentIdx) {
    state.tier = TIERS_ORDERED[currentIdx + 1]; // promote one step
    state.rank = simulateRank(state.points);
    state.totalParticipants = simulateParticipants(state.tier);
    saveState(state);
    return { status: "promoted", previousTier, currentTier: state.tier };
  }

  // Percentile-based promotion/demotion using rank
  const percentile = state.rank / state.totalParticipants;

  // Top 30% (low rank number = high percentile)
  if (percentile <= PROMOTION_PERCENT && nextTier(state.tier) !== null) {
    const next = nextTier(state.tier)!;
    if (state.points >= TIER_CONFIG[next].pointThreshold) {
      state.tier = next;
      state.rank = simulateRank(state.points);
      state.totalParticipants = simulateParticipants(state.tier);
      saveState(state);
      return { status: "promoted", previousTier, currentTier: state.tier };
    }
  }

  // Bottom 10% (high rank number = low percentile)
  if (percentile >= 1 - DEMOTION_PERCENT && prevTier(state.tier) !== null) {
    const prev = prevTier(state.tier)!;
    state.tier = prev;
    state.rank = simulateRank(state.points);
    state.totalParticipants = simulateParticipants(state.tier);
    saveState(state);
    return { status: "demoted", previousTier, currentTier: state.tier };
  }

  return { status: "stay", previousTier, currentTier: state.tier };
}

/**
 * Get detailed progress information toward the next tier.
 */
export function getLeagueProgress(now: Date = new Date()): LeagueProgress {
  const state = getLeagueState(now);
  const current = state.tier;
  const next = nextTier(current);

  const currentThreshold = TIER_CONFIG[current].pointThreshold;
  const nextThreshold = next
    ? TIER_CONFIG[next].pointThreshold
    : currentThreshold + 1000; // legend has no ceiling, use +1000 as virtual cap

  const range = nextThreshold - currentThreshold;
  const progress = state.points - currentThreshold;
  const progressPercent = range > 0
    ? Math.min(100, Math.max(0, (progress / range) * 100))
    : 100;

  // Zone detection based on rank percentile
  const percentile = state.totalParticipants > 0
    ? state.rank / state.totalParticipants
    : 0.5;

  return {
    currentTier: current,
    nextTier: next,
    currentPoints: state.points,
    pointsForNextTier: nextThreshold,
    progressPercent,
    promotionZone: percentile <= PROMOTION_PERCENT && next !== null,
    demotionZone: percentile >= 1 - DEMOTION_PERCENT && prevTier(current) !== null,
  };
}

/**
 * Get display info for a specific tier.
 */
export function getTierInfo(tier: Tier): TierConfig {
  return TIER_CONFIG[tier];
}
