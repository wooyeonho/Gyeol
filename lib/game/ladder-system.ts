// ── Ladder / League System ───────────────────────────────────────────────────
// Weekly competitive league system with promotion/demotion zones.
// Progress is stored in localStorage and resets weekly.

// ── Types ────────────────────────────────────────────────────────────────────

export type League =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "legend";

export interface LadderState {
  league: League;
  points: number;
  rank: number;
  weeklyXp: number;
  promotionZone: boolean;
  demotionZone: boolean;
}

export interface LeagueInfo {
  league: League;
  label: { ko: string; en: string };
  color: string;
  icon: string;
  minPoints: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "gyeol:ladder-state";
const STORAGE_WEEK_KEY = "gyeol:ladder-week";

const LEAGUES_ORDERED: League[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "legend",
];

export const LEAGUE_CONFIG: Record<League, LeagueInfo> = {
  bronze: {
    league: "bronze",
    label: { ko: "브론즈", en: "Bronze" },
    color: "#cd7f32",
    icon: "🥉",
    minPoints: 0,
  },
  silver: {
    league: "silver",
    label: { ko: "실버", en: "Silver" },
    color: "#c0c0c0",
    icon: "🥈",
    minPoints: 100,
  },
  gold: {
    league: "gold",
    label: { ko: "골드", en: "Gold" },
    color: "#ffd700",
    icon: "🥇",
    minPoints: 300,
  },
  platinum: {
    league: "platinum",
    label: { ko: "플래티넘", en: "Platinum" },
    color: "#00ced1",
    icon: "💎",
    minPoints: 600,
  },
  diamond: {
    league: "diamond",
    label: { ko: "다이아몬드", en: "Diamond" },
    color: "#b9f2ff",
    icon: "💠",
    minPoints: 1000,
  },
  master: {
    league: "master",
    label: { ko: "마스터", en: "Master" },
    color: "#9b59b6",
    icon: "👑",
    minPoints: 1500,
  },
  legend: {
    league: "legend",
    label: { ko: "레전드", en: "Legend" },
    color: "#ff4500",
    icon: "🔥",
    minPoints: 2500,
  },
};

/** Top N% considered promotion zone; bottom N% considered demotion zone */
const PROMOTION_THRESHOLD = 0.8; // top 20% of the tier range
const DEMOTION_THRESHOLD = 0.2; // bottom 20% of the tier range

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentWeekId(now: Date = new Date()): string {
  // ISO week-year identifier
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function leagueIndex(league: League): number {
  return LEAGUES_ORDERED.indexOf(league);
}

function getNextLeague(league: League): League | null {
  const idx = leagueIndex(league);
  if (idx >= LEAGUES_ORDERED.length - 1) return null;
  return LEAGUES_ORDERED[idx + 1];
}

function getPrevLeague(league: League): League | null {
  const idx = leagueIndex(league);
  if (idx <= 0) return null;
  return LEAGUES_ORDERED[idx - 1];
}

function getLeaguePointRange(league: League): { min: number; max: number } {
  const idx = leagueIndex(league);
  const min = LEAGUE_CONFIG[league].minPoints;
  const next = LEAGUES_ORDERED[idx + 1];
  const max = next ? LEAGUE_CONFIG[next].minPoints : Infinity;
  return { min, max };
}

function computeZones(league: League, points: number): { promotionZone: boolean; demotionZone: boolean } {
  const { min, max } = getLeaguePointRange(league);
  const range = max === Infinity ? points - min + 500 : max - min;
  const position = points - min;
  const ratio = range > 0 ? position / range : 0;

  return {
    promotionZone: max !== Infinity && ratio >= PROMOTION_THRESHOLD,
    demotionZone: league !== "bronze" && ratio <= DEMOTION_THRESHOLD,
  };
}

/** Simple simulated rank (deterministic based on points) */
function simulateRank(points: number): number {
  if (points <= 0) return 50;
  return Math.max(1, Math.floor(50 - points / 60));
}

function loadState(): LadderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LadderState;
  } catch {
    return null;
  }
}

function saveState(state: LadderState): void {
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

function createDefaultState(): LadderState {
  return {
    league: "bronze",
    points: 0,
    rank: 50,
    weeklyXp: 0,
    promotionZone: false,
    demotionZone: false,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current ladder state, auto-resetting if the week has changed.
 */
export function getLadderState(now: Date = new Date()): LadderState {
  const currentWeek = getCurrentWeekId(now);
  const savedWeek = loadWeekId();

  if (savedWeek !== currentWeek) {
    // Week changed — perform weekly reset but preserve league
    const prev = loadState();
    const league = prev?.league ?? "bronze";
    const state = createDefaultState();
    state.league = league;
    state.points = LEAGUE_CONFIG[league].minPoints;
    state.rank = simulateRank(state.points);
    const zones = computeZones(state.league, state.points);
    state.promotionZone = zones.promotionZone;
    state.demotionZone = zones.demotionZone;

    saveState(state);
    saveWeekId(currentWeek);
    return state;
  }

  const saved = loadState();
  if (saved) return saved;

  const fresh = createDefaultState();
  saveState(fresh);
  saveWeekId(currentWeek);
  return fresh;
}

/**
 * Adds weekly ladder points and recalculates zones + rank.
 */
export function addLadderPoints(points: number, now: Date = new Date()): LadderState {
  if (points <= 0) return getLadderState(now);

  const state = getLadderState(now);
  state.points += points;
  state.weeklyXp += points;
  state.rank = simulateRank(state.points);

  const zones = computeZones(state.league, state.points);
  state.promotionZone = zones.promotionZone;
  state.demotionZone = zones.demotionZone;

  saveState(state);
  return state;
}

/**
 * Checks whether the player should be promoted or demoted based on their
 * current points. Applies the league change and returns the result.
 */
export function checkPromotion(now: Date = new Date()): {
  promoted: boolean;
  demoted: boolean;
  newLeague: League;
} {
  const state = getLadderState(now);
  let promoted = false;
  let demoted = false;

  // Check promotion
  const next = getNextLeague(state.league);
  if (next && state.points >= LEAGUE_CONFIG[next].minPoints) {
    state.league = next;
    promoted = true;
  }

  // Check demotion (only if not also promoted)
  if (!promoted) {
    const prev = getPrevLeague(state.league);
    if (prev && state.points < LEAGUE_CONFIG[state.league].minPoints) {
      state.league = prev;
      demoted = true;
    }
  }

  // Recalculate zones after league change
  const zones = computeZones(state.league, state.points);
  state.promotionZone = zones.promotionZone;
  state.demotionZone = zones.demotionZone;
  state.rank = simulateRank(state.points);

  saveState(state);

  return { promoted, demoted, newLeague: state.league };
}

/**
 * Resets weekly XP but preserves league and base points.
 * Called at the start of each week.
 */
export function resetWeeklyLadder(now: Date = new Date()): void {
  const state = getLadderState(now);
  state.weeklyXp = 0;
  state.rank = simulateRank(state.points);

  const zones = computeZones(state.league, state.points);
  state.promotionZone = zones.promotionZone;
  state.demotionZone = zones.demotionZone;

  saveState(state);
  saveWeekId(getCurrentWeekId(now));
}

/**
 * Returns display info for a given league.
 */
export function getLeagueInfo(league: League): LeagueInfo {
  return LEAGUE_CONFIG[league];
}
