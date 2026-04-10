/**
 * Energy/Hearts system — Candy Crush inspired daily action limits.
 *
 * - Users get 5 energy per day (regenerates 1 every 4 hours)
 * - Premium features (dungeon exploration, special challenges) cost 1 energy
 * - Friends can send energy gifts (up to 3 per day per friend)
 * - Store in localStorage with timestamps for regeneration
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnergyState {
  current: number;
  max: number;
  lastRegenAt: string; // ISO date
}

export interface GiftRecord {
  /** Number of gifts sent to each friend today */
  sentToday: Record<string, number>;
  /** Total gifts received today */
  receivedToday: number;
  /** Date string (YYYY-MM-DD) for daily reset tracking */
  date: string;
}

export interface EnergyGift {
  id: string;
  fromFriendId: string;
  createdAt: string;
  claimed: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENERGY_STORAGE_KEY = "gyeol_energy";
const GIFT_STORAGE_KEY = "gyeol_energy_gifts";
const GIFT_RECORD_STORAGE_KEY = "gyeol_gift_record";

export const MAX_ENERGY = 5;
export const REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours per point
const MAX_GIFTS_PER_FRIEND_PER_DAY = 3;
const MAX_GIFTS_RECEIVED_PER_DAY = 10;

// ---------------------------------------------------------------------------
// Premium features that cost energy
// ---------------------------------------------------------------------------

export type PremiumFeature = "dungeon_exploration" | "special_challenge" | "rare_encounter" | "boss_fight";

const FEATURE_COST: Record<PremiumFeature, number> = {
  dungeon_exploration: 1,
  special_challenge: 1,
  rare_encounter: 1,
  boss_fight: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayString(now?: Date): string {
  const d = now ?? new Date();
  return d.toISOString().slice(0, 10);
}

function getStorage(): typeof localStorage | null {
  if (typeof window === "undefined") return null;
  return localStorage;
}

function generateGiftId(): string {
  return `gift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Energy State — persistence
// ---------------------------------------------------------------------------

function loadEnergyState(): EnergyState {
  const storage = getStorage();
  if (!storage) {
    return { current: MAX_ENERGY, max: MAX_ENERGY, lastRegenAt: new Date().toISOString() };
  }
  const raw = storage.getItem(ENERGY_STORAGE_KEY);
  if (!raw) {
    const initial: EnergyState = {
      current: MAX_ENERGY,
      max: MAX_ENERGY,
      lastRegenAt: new Date().toISOString(),
    };
    storage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as EnergyState;
  } catch {
    return { current: MAX_ENERGY, max: MAX_ENERGY, lastRegenAt: new Date().toISOString() };
  }
}

function saveEnergyState(state: EnergyState): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
}

// ---------------------------------------------------------------------------
// Gift Record — persistence
// ---------------------------------------------------------------------------

function loadGiftRecord(): GiftRecord {
  const storage = getStorage();
  const today = getTodayString();
  if (!storage) {
    return { sentToday: {}, receivedToday: 0, date: today };
  }
  const raw = storage.getItem(GIFT_RECORD_STORAGE_KEY);
  if (!raw) {
    return { sentToday: {}, receivedToday: 0, date: today };
  }
  try {
    const record = JSON.parse(raw) as GiftRecord;
    // Reset if it is a new day
    if (record.date !== today) {
      return { sentToday: {}, receivedToday: 0, date: today };
    }
    return record;
  } catch {
    return { sentToday: {}, receivedToday: 0, date: today };
  }
}

function saveGiftRecord(record: GiftRecord): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(GIFT_RECORD_STORAGE_KEY, JSON.stringify(record));
}

// ---------------------------------------------------------------------------
// Pending Gifts — persistence
// ---------------------------------------------------------------------------

function loadPendingGifts(): EnergyGift[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(GIFT_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EnergyGift[];
  } catch {
    return [];
  }
}

function savePendingGifts(gifts: EnergyGift[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(GIFT_STORAGE_KEY, JSON.stringify(gifts));
}

// ---------------------------------------------------------------------------
// Core API — Energy
// ---------------------------------------------------------------------------

/** Apply passive time-based regeneration and return current energy state. */
export function regenerateEnergy(now?: Date): EnergyState {
  const state = loadEnergyState();
  if (state.current >= state.max) {
    state.lastRegenAt = (now ?? new Date()).toISOString();
    saveEnergyState(state);
    return state;
  }

  const currentTime = (now ?? new Date()).getTime();
  const lastRegen = new Date(state.lastRegenAt).getTime();
  const elapsed = currentTime - lastRegen;
  const pointsToAdd = Math.floor(elapsed / REGEN_INTERVAL_MS);

  if (pointsToAdd > 0) {
    state.current = Math.min(state.max, state.current + pointsToAdd);
    state.lastRegenAt = new Date(lastRegen + pointsToAdd * REGEN_INTERVAL_MS).toISOString();
    saveEnergyState(state);
  }

  return state;
}

/** Get the current energy state (applies regeneration first). */
export function getEnergy(now?: Date): EnergyState {
  return regenerateEnergy(now);
}

/** Consume 1 energy for a premium action. Returns true if successful. */
export function useEnergy(): boolean {
  const state = regenerateEnergy();
  if (state.current < 1) return false;

  state.current -= 1;
  if (state.current < state.max) {
    state.lastRegenAt = new Date().toISOString();
  }
  saveEnergyState(state);
  return true;
}

/** Check if the user can use a specific premium feature. */
export function canUseFeature(feature: PremiumFeature): boolean {
  const state = regenerateEnergy();
  const cost = FEATURE_COST[feature] ?? 1;
  return state.current >= cost;
}

// ---------------------------------------------------------------------------
// Core API — Friend Energy Gifts
// ---------------------------------------------------------------------------

/**
 * Send an energy gift to a friend.
 * Daily limit: 3 gifts per friend.
 * Returns the gift object on success, or null if the limit is reached.
 */
export function sendEnergyGift(friendId: string): EnergyGift | null {
  const record = loadGiftRecord();
  const sentCount = record.sentToday[friendId] ?? 0;

  if (sentCount >= MAX_GIFTS_PER_FRIEND_PER_DAY) {
    return null;
  }

  const gift: EnergyGift = {
    id: generateGiftId(),
    fromFriendId: friendId,
    createdAt: new Date().toISOString(),
    claimed: false,
  };

  // Update sent count
  record.sentToday[friendId] = sentCount + 1;
  saveGiftRecord(record);

  // Store the pending gift (in a real app this goes to the friend's inbox)
  const pending = loadPendingGifts();
  pending.push(gift);
  savePendingGifts(pending);

  return gift;
}

/**
 * Claim an energy gift by id. Adds 1 energy (can exceed max via bonus).
 * Daily limit: 10 gifts received.
 * Returns true if claimed successfully.
 */
export function claimEnergyGift(giftId: string): boolean {
  const record = loadGiftRecord();
  if (record.receivedToday >= MAX_GIFTS_RECEIVED_PER_DAY) {
    return false;
  }

  const pending = loadPendingGifts();
  const giftIndex = pending.findIndex((g) => g.id === giftId && !g.claimed);
  if (giftIndex === -1) return false;

  // Mark as claimed
  pending[giftIndex].claimed = true;
  savePendingGifts(pending);

  // Add energy (up to max)
  const state = regenerateEnergy();
  state.current = Math.min(state.max + MAX_GIFTS_RECEIVED_PER_DAY, state.current + 1);
  saveEnergyState(state);

  // Update received count
  record.receivedToday += 1;
  saveGiftRecord(record);

  return true;
}

/** Receive an energy gift from a friend (convenience alias for claiming the first unclaimed gift). */
export function receiveGift(): boolean {
  const pending = loadPendingGifts();
  const unclaimed = pending.find((g) => !g.claimed);
  if (!unclaimed) return false;
  return claimEnergyGift(unclaimed.id);
}
