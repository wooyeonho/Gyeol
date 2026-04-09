/**
 * Energy/Hearts system — Candy Crush inspired daily action limits.
 * Free users get limited daily energy, which regenerates over time.
 * Premium users have unlimited energy.
 */

export interface EnergyState {
  current: number;
  max: number;
  lastRegenAt: string; // ISO date
  bonusEnergy: number; // From friends, items, etc.
}

const STORAGE_KEY = "gyeol_energy";
const DEFAULT_MAX = 20;
const REGEN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes per energy point
const REGEN_AMOUNT = 1;

/** Get energy state from localStorage */
export function getEnergyState(): EnergyState {
  if (typeof window === "undefined") {
    return { current: DEFAULT_MAX, max: DEFAULT_MAX, lastRegenAt: new Date().toISOString(), bonusEnergy: 0 };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial: EnergyState = {
      current: DEFAULT_MAX,
      max: DEFAULT_MAX,
      lastRegenAt: new Date().toISOString(),
      bonusEnergy: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const state = JSON.parse(raw) as EnergyState;
    // Apply passive regeneration
    return applyRegen(state);
  } catch {
    return { current: DEFAULT_MAX, max: DEFAULT_MAX, lastRegenAt: new Date().toISOString(), bonusEnergy: 0 };
  }
}

/** Save energy state */
function saveState(state: EnergyState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Apply passive time-based regeneration */
function applyRegen(state: EnergyState): EnergyState {
  if (state.current >= state.max) {
    state.lastRegenAt = new Date().toISOString();
    return state;
  }

  const now = Date.now();
  const lastRegen = new Date(state.lastRegenAt).getTime();
  const elapsed = now - lastRegen;
  const pointsToAdd = Math.floor(elapsed / REGEN_INTERVAL_MS) * REGEN_AMOUNT;

  if (pointsToAdd > 0) {
    state.current = Math.min(state.max, state.current + pointsToAdd);
    state.lastRegenAt = new Date(lastRegen + pointsToAdd * REGEN_INTERVAL_MS).toISOString();
    saveState(state);
  }

  return state;
}

/** Consume energy for an action. Returns true if successful. */
export function consumeEnergy(amount = 1): boolean {
  const state = getEnergyState();
  // Use bonus energy first
  if (state.bonusEnergy >= amount) {
    state.bonusEnergy -= amount;
    saveState(state);
    return true;
  }
  const remaining = amount - state.bonusEnergy;
  if (state.current < remaining) return false;

  state.bonusEnergy = 0;
  state.current -= remaining;
  if (state.current < state.max) {
    // Start regen timer from now if we just dropped below max
    state.lastRegenAt = new Date().toISOString();
  }
  saveState(state);
  return true;
}

/** Add bonus energy (from friends, items, rewards) */
export function addBonusEnergy(amount: number): void {
  const state = getEnergyState();
  state.bonusEnergy += amount;
  saveState(state);
}

/** Fully refill energy */
export function refillEnergy(): void {
  const state = getEnergyState();
  state.current = state.max;
  state.lastRegenAt = new Date().toISOString();
  saveState(state);
}

/** Get time until next energy point regenerates */
export function getTimeToNextRegen(): { minutes: number; seconds: number } | null {
  const state = getEnergyState();
  if (state.current >= state.max) return null;

  const lastRegen = new Date(state.lastRegenAt).getTime();
  const nextRegenAt = lastRegen + REGEN_INTERVAL_MS;
  const remaining = Math.max(0, nextRegenAt - Date.now());

  return {
    minutes: Math.floor(remaining / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
  };
}

/** Check if user has enough energy */
export function hasEnergy(amount = 1): boolean {
  const state = getEnergyState();
  return (state.current + state.bonusEnergy) >= amount;
}

/** Increase max energy (level up reward) */
export function increaseMaxEnergy(amount: number): void {
  const state = getEnergyState();
  state.max += amount;
  state.current += amount; // Grant the new points immediately
  saveState(state);
}
