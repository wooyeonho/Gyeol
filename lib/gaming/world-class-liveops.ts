/**
 * World-class gaming / liveops patterns — synthesized from 12+ top live games.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.4):
 *   Fortnite, Genshin Impact, Clash Royale, Pokemon GO, Animal Crossing,
 *   Roblox, Among Us, Monster Hunter Now, Marvel Snap, Destiny 2,
 *   Valorant, League of Legends.
 *
 * Scope: season passes, pity gacha, daily/weekly resets, event rotation,
 * rank ladders. Pure data + pure functions; no network, no randomness
 * that isn't seeded.
 */

export type LiveOpsPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const LIVEOPS_PRINCIPLES: readonly LiveOpsPrinciple[] = [
  {
    id: "season-arc",
    source: "Fortnite",
    rule: "Each season has a single narrative arc; the finale is a live event, not a patch note.",
  },
  {
    id: "soft-pity",
    source: "Genshin Impact",
    rule: "Gacha pity climbs deterministically toward a guaranteed drop after N pulls.",
  },
  {
    id: "daily-reset",
    source: "Clash Royale",
    rule: "Daily tasks reset at a fixed local wall-clock time, visible in the HUD as a countdown.",
  },
  {
    id: "location-event",
    source: "Pokemon GO",
    rule: "Events can bind to real-world location; drops and encounters shift by geofence.",
  },
  {
    id: "real-time-sim",
    source: "Animal Crossing",
    rule: "The world runs on real-world clock even when the player isn't looking.",
  },
  {
    id: "ugc-economy",
    source: "Roblox",
    rule: "Users can publish and earn from their own content inside the game surface.",
  },
  {
    id: "ephemeral-lobby",
    source: "Among Us",
    rule: "Match lobbies are ephemeral and code-joinable; no permanent party needed.",
  },
  {
    id: "three-card-deck",
    source: "Marvel Snap",
    rule: "Sessions must end within 3–5 minutes to stay reachable in mobile contexts.",
  },
  {
    id: "season-pass",
    source: "Destiny 2 / Fortnite",
    rule: "Paid passes unlock premium track; free track still rewards engagement.",
  },
  {
    id: "agent-roster",
    source: "Valorant",
    rule: "A roster of distinct personas with unique kits drives identity and replay.",
  },
  {
    id: "rank-ladder",
    source: "League of Legends",
    rule: "Ranks decay only on inactivity; public rank is a long-term commitment signal.",
  },
  {
    id: "geo-encounter",
    source: "Monster Hunter Now",
    rule: "Real-world geography maps to encounter rarity; rare spawns get push notifications.",
  },
] as const;

/* ── Pity gacha system ────────────────────────────────────────────────── */

export type PityState = {
  pullsSinceGuaranteed: number;
  threshold: number;
  softStart: number;
};

/**
 * Compute the drop probability for a pity system given the current state.
 * Flat before `softStart`; linear ramp from softStart to threshold; 1.0 at threshold.
 */
export function pityDropChance(state: PityState, baseChance: number): number {
  const n = state.pullsSinceGuaranteed;
  if (n >= state.threshold) return 1;
  if (n < state.softStart) return baseChance;
  const span = state.threshold - state.softStart;
  const ramp = (n - state.softStart) / span;
  return baseChance + (1 - baseChance) * ramp;
}

/** Apply one pull, returning the new state. Hit resets the counter. */
export function applyPull(state: PityState, hit: boolean): PityState {
  if (hit) return { ...state, pullsSinceGuaranteed: 0 };
  return { ...state, pullsSinceGuaranteed: state.pullsSinceGuaranteed + 1 };
}

/* ── Daily/weekly reset countdown ─────────────────────────────────────── */

export function secondsUntilDailyReset(now: Date, resetHour: number, timezoneOffsetHours: number): number {
  const localHour = (now.getUTCHours() + timezoneOffsetHours + 24) % 24;
  const hoursUntil = (resetHour - localHour + 24) % 24;
  const mins = now.getUTCMinutes();
  const secs = now.getUTCSeconds();
  if (hoursUntil === 0 && (mins > 0 || secs > 0)) {
    return 24 * 3600 - (mins * 60 + secs);
  }
  return hoursUntil * 3600 - mins * 60 - secs;
}

/* ── Season pass ──────────────────────────────────────────────────────── */

export type PassTrack = "free" | "premium";

export type PassReward = {
  level: number;
  track: PassTrack;
  label: string;
};

export function levelFromXp(xp: number, xpPerLevel = 1000, maxLevel = 100): number {
  return Math.min(maxLevel, Math.floor(xp / xpPerLevel));
}

export function availableRewards(
  rewards: readonly PassReward[],
  level: number,
  hasPremium: boolean,
): PassReward[] {
  return rewards.filter(
    (r) => r.level <= level && (r.track === "free" || hasPremium),
  );
}

/* ── Rank decay ───────────────────────────────────────────────────────── */

export function rankAfterInactivity(
  currentLp: number,
  daysInactive: number,
  gracePeriodDays = 14,
  dailyDecay = 25,
): number {
  if (daysInactive <= gracePeriodDays) return currentLp;
  const effective = daysInactive - gracePeriodDays;
  return Math.max(0, currentLp - effective * dailyDecay);
}
