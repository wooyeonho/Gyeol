/**
 * Genshin Impact-style Pity System for Mystery Boxes
 *
 * Tracks consecutive box opens without high-rarity results.
 * Guarantees:
 *   - At 50 opens without epic/legendary → guaranteed epic or better
 *   - At 90 opens without legendary → guaranteed legendary
 *   - Counter resets when the corresponding rarity (or higher) is obtained
 *
 * This module manages the pity counter independently from the box-rarity
 * pity in mystery-box.ts — it targets the *item* rarity inside each box
 * (via rollRandomItem) rather than the box rarity itself.
 */

import type { ItemRarity } from "@/lib/creature/items";

// ── Constants ──

const PITY_KEY = "gyeol_pity_counter_v1";

export const EPIC_PITY_THRESHOLD = 50;
export const LEGENDARY_PITY_THRESHOLD = 90;

/** Soft-pity kicks in a few opens before the hard guarantee */
export const EPIC_SOFT_PITY_START = 40;
export const LEGENDARY_SOFT_PITY_START = 75;

/** Show encouragement message when pity count exceeds this */
export const ENCOURAGEMENT_THRESHOLD = 70;

// ── Internal state ──

interface PityData {
  /** Opens since last epic or legendary */
  count: number;
}

function readPity(): PityData {
  if (typeof window === "undefined") return { count: 0 };
  try {
    const raw = window.localStorage.getItem(PITY_KEY);
    return raw ? (JSON.parse(raw) as PityData) : { count: 0 };
  } catch {
    return { count: 0 };
  }
}

function writePity(data: PityData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PITY_KEY, JSON.stringify(data));
  } catch {
    /* localStorage may be unavailable */
  }
}

// ── Public API ──

/** Get the current pity counter (opens since last epic/legendary). */
export function getPityCount(): number {
  return readPity().count;
}

/**
 * Increment the pity counter by 1.
 * Call this after opening a box that did NOT yield epic or legendary.
 * Returns the new counter value.
 */
export function incrementPity(): number {
  const data = readPity();
  data.count += 1;
  writePity(data);
  return data.count;
}

/**
 * Reset the pity counter to 0.
 * Call this after the player obtains an epic or legendary item.
 */
export function resetPity(): void {
  writePity({ count: 0 });
}

/**
 * Check whether the current pity count should force a guaranteed rarity.
 *
 * - At >= 90 opens → "legendary"
 * - At >= 50 opens → "epic"
 * - Otherwise → null (no override)
 */
export function shouldGuaranteePity(): "legendary" | "epic" | null {
  const { count } = readPity();
  if (count >= LEGENDARY_PITY_THRESHOLD) return "legendary";
  if (count >= EPIC_PITY_THRESHOLD) return "epic";
  return null;
}

/**
 * Calculate soft-pity bonus multiplier for rarity weights.
 * Between soft-pity start and hard threshold, the chance ramps up linearly.
 *
 * Returns { epicBoost, legendaryBoost } — additive weight bonuses.
 */
export function getSoftPityBoost(): { epicBoost: number; legendaryBoost: number } {
  const { count } = readPity();
  let epicBoost = 0;
  let legendaryBoost = 0;

  if (count >= EPIC_SOFT_PITY_START && count < EPIC_PITY_THRESHOLD) {
    // Ramp from 0 to ~15 bonus weight over 10 opens
    epicBoost = (count - EPIC_SOFT_PITY_START) * 1.5;
  }

  if (count >= LEGENDARY_SOFT_PITY_START && count < LEGENDARY_PITY_THRESHOLD) {
    // Ramp from 0 to ~7.5 bonus weight over 15 opens
    legendaryBoost = (count - LEGENDARY_SOFT_PITY_START) * 0.5;
  }

  return { epicBoost, legendaryBoost };
}

/**
 * Process pity after a box is opened.
 * Call with the rarity of the item the player received.
 * Resets or increments the counter as appropriate.
 *
 * Returns the updated pity count.
 */
export function processPityAfterOpen(resultRarity: ItemRarity): number {
  const isHighRarity = resultRarity === "epic" || resultRarity === "legendary";
  if (isHighRarity) {
    resetPity();
    return 0;
  }
  return incrementPity();
}
