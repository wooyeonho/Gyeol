/**
 * PvP Ranking system — competitive ladder with matchmaking.
 * Creature team battles based on stats and DNA advantages.
 */

export type PvPResult = "win" | "loss" | "draw";

export interface PvPMatch {
  id: string;
  opponentName: string;
  opponentLevel: number;
  result: PvPResult;
  ratingChange: number;
  timestamp: string;
}

export interface PvPState {
  rating: number; // ELO-like rating
  wins: number;
  losses: number;
  draws: number;
  streak: number; // Current win streak
  bestStreak: number;
  rank: PvPRank;
  matchHistory: PvPMatch[];
  seasonId: string;
}

export type PvPRank = "unranked" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster";

const STORAGE_KEY = "gyeol_pvp_state";

export const PVP_RANKS: Record<PvPRank, { minRating: number; color: string; label: { ko: string; en: string }; icon: string }> = {
  unranked:     { minRating: 0,    color: "#6b7280", label: { ko: "배치 전",    en: "Unranked" },     icon: "⚪" },
  bronze:       { minRating: 800,  color: "#cd7f32", label: { ko: "브론즈",     en: "Bronze" },       icon: "🥉" },
  silver:       { minRating: 1000, color: "#c0c0c0", label: { ko: "실버",       en: "Silver" },       icon: "🥈" },
  gold:         { minRating: 1200, color: "#ffd700", label: { ko: "골드",       en: "Gold" },         icon: "🥇" },
  platinum:     { minRating: 1400, color: "#00cec9", label: { ko: "플래티넘",   en: "Platinum" },     icon: "💠" },
  diamond:      { minRating: 1600, color: "#6c5ce7", label: { ko: "다이아몬드", en: "Diamond" },      icon: "💎" },
  master:       { minRating: 1800, color: "#e17055", label: { ko: "마스터",     en: "Master" },       icon: "🔥" },
  grandmaster:  { minRating: 2000, color: "#fdcb6e", label: { ko: "그랜드마스터", en: "Grandmaster" }, icon: "👑" },
};

const RANK_ORDER: PvPRank[] = ["unranked", "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"];

/** Get PvP state from localStorage */
export function getPvPState(): PvPState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    return JSON.parse(raw) as PvPState;
  } catch {
    return defaultState();
  }
}

function defaultState(): PvPState {
  return {
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    rank: "bronze",
    matchHistory: [],
    seasonId: getCurrentSeasonId(),
  };
}

function getCurrentSeasonId(): string {
  const now = new Date();
  return `s${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Save PvP state */
export function savePvPState(state: PvPState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Calculate rank from rating */
export function getRankFromRating(rating: number): PvPRank {
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    if (rating >= PVP_RANKS[RANK_ORDER[i]].minRating) {
      return RANK_ORDER[i];
    }
  }
  return "unranked";
}

/** Calculate ELO change */
function calculateEloChange(playerRating: number, opponentRating: number, result: PvPResult): number {
  const K = 32; // K-factor
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

/** Record a match result */
export function recordMatch(opponentName: string, opponentRating: number, opponentLevel: number, result: PvPResult): PvPMatch {
  const state = getPvPState();
  const ratingChange = calculateEloChange(state.rating, opponentRating, result);

  state.rating = Math.max(0, state.rating + ratingChange);
  state.rank = getRankFromRating(state.rating);

  if (result === "win") {
    state.wins++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
  } else if (result === "loss") {
    state.losses++;
    state.streak = 0;
  } else {
    state.draws++;
  }

  const match: PvPMatch = {
    id: `match_${Date.now()}`,
    opponentName,
    opponentLevel,
    result,
    ratingChange,
    timestamp: new Date().toISOString(),
  };

  state.matchHistory.unshift(match);
  if (state.matchHistory.length > 50) state.matchHistory = state.matchHistory.slice(0, 50);

  savePvPState(state);
  return match;
}

/** Get win rate as percentage */
export function getWinRate(state: PvPState): number {
  const total = state.wins + state.losses + state.draws;
  if (total === 0) return 0;
  return Math.round((state.wins / total) * 100);
}

/** Get rank info */
export function getRankInfo(rank: PvPRank) {
  return PVP_RANKS[rank];
}

/** Reset for new season */
export function resetSeason(): void {
  const state = getPvPState();
  // Soft reset — pull rating toward 1000
  state.rating = Math.round(state.rating * 0.7 + 1000 * 0.3);
  state.rank = getRankFromRating(state.rating);
  state.wins = 0;
  state.losses = 0;
  state.draws = 0;
  state.streak = 0;
  state.matchHistory = [];
  state.seasonId = getCurrentSeasonId();
  savePvPState(state);
}
