/**
 * Creature Care Loop — Tamagotchi-style gauges for hunger, energy, happiness.
 *
 * Each gauge is 0..100. They decay naturally over time and can be restored
 * through user actions (feeding, touching, chatting).
 *
 * When any gauge hits 0, the creature enters a "sick" state with visual indicators.
 */

export interface CareState {
  hunger: number;    // 0..100
  energy: number;    // 0..100
  happiness: number; // 0..100
  lastUpdatedAt: string; // ISO timestamp
  sickSince: string | null; // ISO timestamp when creature became sick
}

export function createDefaultCareState(): CareState {
  return {
    hunger: 80,
    energy: 80,
    happiness: 80,
    lastUpdatedAt: new Date().toISOString(),
    sickSince: null,
  };
}

/**
 * Decay rates per hour.
 * Hunger decays fastest (need to feed), energy moderate, happiness slowest.
 */
const DECAY_RATES = {
  hunger: 2.5,     // ~40 hours to empty from full
  energy: 1.8,     // ~55 hours
  happiness: 1.2,  // ~83 hours
} as const;

/**
 * Apply time-based decay to care state.
 * Should be called when loading agent state or during heartbeat.
 */
export function applyCareDecay(state: CareState): CareState {
  const now = new Date();
  const lastUpdated = new Date(state.lastUpdatedAt);
  const hoursPassed = (now.getTime() - lastUpdated.getTime()) / 3600000;

  if (hoursPassed < 0.05) return state; // < 3 minutes, skip

  const next: CareState = {
    hunger: Math.max(0, state.hunger - DECAY_RATES.hunger * hoursPassed),
    energy: Math.max(0, state.energy - DECAY_RATES.energy * hoursPassed),
    happiness: Math.max(0, state.happiness - DECAY_RATES.happiness * hoursPassed),
    lastUpdatedAt: now.toISOString(),
    sickSince: state.sickSince,
  };

  // Check sick state
  const isSick = next.hunger <= 0 || next.energy <= 0 || next.happiness <= 0;
  if (isSick && !next.sickSince) {
    next.sickSince = now.toISOString();
  } else if (!isSick) {
    next.sickSince = null;
  }

  return next;
}

/**
 * Feed the creature — restores hunger and gives a tiny DNA nudge.
 * @param coinCost - coins deducted (caller handles deduction)
 * @returns updated care state + DNA nudge axis
 */
export function feedCreature(state: CareState): {
  careState: CareState;
  dnaNudge: { axis: string; delta: number } | null;
} {
  const restored = Math.min(100, state.hunger + 30);
  const happinessBoost = Math.min(100, state.happiness + 5);
  const now = new Date().toISOString();

  const careState: CareState = {
    ...state,
    hunger: restored,
    happiness: happinessBoost,
    lastUpdatedAt: now,
    sickSince: restored > 0 && state.energy > 0 && happinessBoost > 0 ? null : state.sickSince,
  };

  // Feeding affects warmth axis slightly
  const dnaNudge = { axis: "warmth", delta: 0.003 };

  return { careState, dnaNudge };
}

/**
 * Rest the creature — restores energy.
 */
export function restCreature(state: CareState): CareState {
  const now = new Date().toISOString();
  return {
    ...state,
    energy: Math.min(100, state.energy + 25),
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && Math.min(100, state.energy + 25) > 0 && state.happiness > 0 ? null : state.sickSince,
  };
}

/**
 * Touch/pet the creature — restores happiness.
 * Connected to touch-physics system.
 */
export function petCreature(state: CareState, affinityDelta: number): CareState {
  const boost = Math.abs(affinityDelta) * 3; // scale affinity to happiness
  const now = new Date().toISOString();
  return {
    ...state,
    happiness: Math.min(100, state.happiness + boost),
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && state.energy > 0 && Math.min(100, state.happiness + boost) > 0 ? null : state.sickSince,
  };
}

/**
 * Chat with creature — small boost to energy and happiness.
 */
export function chatBoostCare(state: CareState): CareState {
  const now = new Date().toISOString();
  return {
    ...state,
    energy: Math.min(100, state.energy + 3),
    happiness: Math.min(100, state.happiness + 5),
    lastUpdatedAt: now,
    sickSince: state.hunger > 0 && Math.min(100, state.energy + 3) > 0 && Math.min(100, state.happiness + 5) > 0 ? null : state.sickSince,
  };
}

/**
 * Check if creature is in a sick state.
 */
export function isSick(state: CareState): boolean {
  return state.hunger <= 0 || state.energy <= 0 || state.happiness <= 0;
}

/**
 * Get the most critical gauge (lowest).
 */
export function getCriticalGauge(state: CareState): "hunger" | "energy" | "happiness" {
  if (state.hunger <= state.energy && state.hunger <= state.happiness) return "hunger";
  if (state.energy <= state.happiness) return "energy";
  return "happiness";
}

/**
 * Feeding cost in coins.
 */
export const FEED_COST = 5;

/**
 * Rest cost in coins.
 */
export const REST_COST = 3;
