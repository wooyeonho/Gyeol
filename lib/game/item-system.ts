/**
 * Diablo-style Item / Equipment System
 *
 * A functional, pure-logic item system with 5 rarity tiers, 4 equipment slots,
 * 20+ items, and side-by-side stat comparison.
 *
 * StatKey is imported from stat-system.ts (hp, atk, def, spd, wis, cha).
 */

import type { StatKey } from "./stat-system";

// ── Types ──────────────────────────────────────────────────────────────────

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemSlot = "head" | "body" | "accessory" | "companion";

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  slot: ItemSlot;
  statBonuses: Partial<Record<StatKey, number>>;
  icon: string;
}

export interface StatComparison {
  stat: StatKey;
  current: number;
  candidate: number;
  diff: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const RARITY_ORDER: Record<ItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
};

// ── Item Catalog (20+ items across all slots & rarities) ───────────────────

export const ALL_ITEMS: Item[] = [
  // ─── HEAD ────────────────────────────────────────────
  {
    id: "cloth_cap",
    name: "Cloth Cap",
    description: "A simple cloth cap. Better than nothing.",
    rarity: "common",
    slot: "head",
    statBonuses: { def: 2 },
    icon: "🧢",
  },
  {
    id: "leather_helm",
    name: "Leather Helm",
    description: "Hardened leather provides decent protection.",
    rarity: "uncommon",
    slot: "head",
    statBonuses: { def: 5, hp: 3 },
    icon: "⛑️",
  },
  {
    id: "iron_crown",
    name: "Iron Crown",
    description: "A crown forged in iron. Commands respect.",
    rarity: "rare",
    slot: "head",
    statBonuses: { def: 8, cha: 4 },
    icon: "👑",
  },
  {
    id: "arcane_circlet",
    name: "Arcane Circlet",
    description: "Hums with ancient wisdom.",
    rarity: "epic",
    slot: "head",
    statBonuses: { wis: 12, spd: 4, hp: 5 },
    icon: "💫",
  },
  {
    id: "void_helm",
    name: "Helm of the Void",
    description: "Peers into dimensions beyond comprehension.",
    rarity: "legendary",
    slot: "head",
    statBonuses: { wis: 18, def: 10, hp: 8, cha: 5 },
    icon: "🌑",
  },

  // ─── BODY ────────────────────────────────────────────
  {
    id: "cotton_robe",
    name: "Cotton Robe",
    description: "A plain robe offering minimal warmth.",
    rarity: "common",
    slot: "body",
    statBonuses: { hp: 4 },
    icon: "👘",
  },
  {
    id: "chain_mail",
    name: "Chain Mail",
    description: "Interlocking rings deflect blows.",
    rarity: "uncommon",
    slot: "body",
    statBonuses: { def: 7, hp: 5 },
    icon: "🦺",
  },
  {
    id: "shadow_cloak",
    name: "Shadow Cloak",
    description: "Woven from twilight threads.",
    rarity: "rare",
    slot: "body",
    statBonuses: { spd: 8, def: 5, atk: 3 },
    icon: "🧥",
  },
  {
    id: "dragon_plate",
    name: "Dragon Plate",
    description: "Scales of a fallen dragon, virtually indestructible.",
    rarity: "epic",
    slot: "body",
    statBonuses: { def: 15, hp: 10, atk: 5 },
    icon: "🐉",
  },
  {
    id: "celestial_armor",
    name: "Celestial Armor",
    description: "Forged in starlight, it protects body and soul.",
    rarity: "legendary",
    slot: "body",
    statBonuses: { def: 20, hp: 15, wis: 8, cha: 7 },
    icon: "🌟",
  },

  // ─── ACCESSORY ───────────────────────────────────────
  {
    id: "wooden_charm",
    name: "Wooden Charm",
    description: "A hand-carved good-luck charm.",
    rarity: "common",
    slot: "accessory",
    statBonuses: { cha: 2 },
    icon: "🪵",
  },
  {
    id: "silver_ring",
    name: "Silver Ring",
    description: "A polished silver ring with minor enchantment.",
    rarity: "uncommon",
    slot: "accessory",
    statBonuses: { atk: 4, spd: 3 },
    icon: "💍",
  },
  {
    id: "ruby_pendant",
    name: "Ruby Pendant",
    description: "The deep red gem pulses with fiery energy.",
    rarity: "rare",
    slot: "accessory",
    statBonuses: { atk: 9, hp: 5 },
    icon: "📿",
  },
  {
    id: "amulet_of_storms",
    name: "Amulet of Storms",
    description: "Lightning crackles around the wearer.",
    rarity: "epic",
    slot: "accessory",
    statBonuses: { atk: 12, spd: 8, wis: 4 },
    icon: "⚡",
  },
  {
    id: "heart_of_eternity",
    name: "Heart of Eternity",
    description: "A gem containing a fragment of time itself.",
    rarity: "legendary",
    slot: "accessory",
    statBonuses: { hp: 20, atk: 12, spd: 10, wis: 8 },
    icon: "💎",
  },

  // ─── COMPANION ───────────────────────────────────────
  {
    id: "baby_slime",
    name: "Baby Slime",
    description: "A tiny slime that bounces beside you.",
    rarity: "common",
    slot: "companion",
    statBonuses: { hp: 3 },
    icon: "🟢",
  },
  {
    id: "scout_hawk",
    name: "Scout Hawk",
    description: "A trained hawk that watches the skies.",
    rarity: "uncommon",
    slot: "companion",
    statBonuses: { spd: 6, atk: 2 },
    icon: "🦅",
  },
  {
    id: "spirit_fox",
    name: "Spirit Fox",
    description: "A ghostly fox that whispers secrets.",
    rarity: "rare",
    slot: "companion",
    statBonuses: { wis: 7, spd: 5, cha: 3 },
    icon: "🦊",
  },
  {
    id: "war_golem",
    name: "War Golem",
    description: "A hulking stone construct that fights by your side.",
    rarity: "epic",
    slot: "companion",
    statBonuses: { atk: 10, def: 10, hp: 8 },
    icon: "🗿",
  },
  {
    id: "phoenix_companion",
    name: "Phoenix",
    description: "An immortal firebird, reborn from ash endlessly.",
    rarity: "legendary",
    slot: "companion",
    statBonuses: { hp: 15, atk: 15, def: 8, spd: 8, wis: 6, cha: 10 },
    icon: "🔥",
  },

  // ─── Extra items to reach 24 total ──────────────────
  {
    id: "focus_band",
    name: "Focus Band",
    description: "Sharpens the mind under pressure.",
    rarity: "uncommon",
    slot: "accessory",
    statBonuses: { wis: 5, cha: 2 },
    icon: "🎗️",
  },
  {
    id: "steel_visor",
    name: "Steel Visor",
    description: "Protects the face without limiting vision.",
    rarity: "rare",
    slot: "head",
    statBonuses: { def: 7, atk: 4, spd: 2 },
    icon: "🪖",
  },
  {
    id: "enchanted_vest",
    name: "Enchanted Vest",
    description: "Threads shimmer with residual magic.",
    rarity: "uncommon",
    slot: "body",
    statBonuses: { hp: 6, wis: 3 },
    icon: "🎽",
  },
  {
    id: "ember_sprite",
    name: "Ember Sprite",
    description: "A tiny fire spirit that keeps you warm.",
    rarity: "rare",
    slot: "companion",
    statBonuses: { atk: 6, cha: 5, spd: 3 },
    icon: "✨",
  },
];

// ── Helper: build a lookup map ─────────────────────────────────────────────

const ITEM_MAP = new Map<string, Item>(ALL_ITEMS.map((item) => [item.id, item]));

export function getItemById(id: string): Item | undefined {
  return ITEM_MAP.get(id);
}

// ── Core Functions ─────────────────────────────────────────────────────────

/** Resolve full Item objects for a list of equipped item IDs. */
export function getEquippedItems(inventory: Item[], equipped: string[]): Item[] {
  return equipped
    .map((id) => inventory.find((item) => item.id === id))
    .filter((item): item is Item => item !== undefined);
}

/** Sum all stat bonuses from an array of equipped items. */
export function calculateEquipmentBonuses(
  equipped: Item[],
): Partial<Record<StatKey, number>> {
  const totals: Partial<Record<StatKey, number>> = {};

  for (const item of equipped) {
    for (const [stat, value] of Object.entries(item.statBonuses)) {
      const key = stat as StatKey;
      totals[key] = (totals[key] ?? 0) + value;
    }
  }

  return totals;
}

/**
 * Check whether an item can be equipped given the current loadout.
 * Rules:
 *   - Only one item per slot.
 *   - Returns true if the slot is free OR if equipping would replace the
 *     current item in that slot (swap is always allowed).
 */
export function canEquipItem(item: Item, currentEquipped: Item[]): boolean {
  // The item can always go into its slot (replacing whatever is there).
  // The only invalid case would be a malformed item, but we trust types here.
  // We return true if at most one item occupies this slot already.
  const sameSlotCount = currentEquipped.filter((e) => e.slot === item.slot).length;
  return sameSlotCount <= 1;
}

/** Filter items by rarity. */
export function getItemsByRarity(items: Item[], rarity: ItemRarity): Item[] {
  return items.filter((item) => item.rarity === rarity);
}

/**
 * Diablo-style side-by-side stat comparison.
 * Compares `candidate` against `current` (which may be null if slot is empty).
 * Returns one entry per stat that appears on either item, with the diff.
 */
export function compareItems(
  current: Item | null,
  candidate: Item,
): StatComparison[] {
  const allStats = new Set<StatKey>();

  if (current) {
    for (const key of Object.keys(current.statBonuses)) {
      allStats.add(key as StatKey);
    }
  }
  for (const key of Object.keys(candidate.statBonuses)) {
    allStats.add(key as StatKey);
  }

  const result: StatComparison[] = [];

  for (const stat of allStats) {
    const curVal = current?.statBonuses[stat] ?? 0;
    const candVal = candidate.statBonuses[stat] ?? 0;
    result.push({
      stat,
      current: curVal,
      candidate: candVal,
      diff: candVal - curVal,
    });
  }

  // Sort by absolute diff descending so the biggest changes appear first.
  result.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return result;
}
