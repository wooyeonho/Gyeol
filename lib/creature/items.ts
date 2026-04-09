/**
 * Items & Equipment System
 *
 * Functional items that affect creature stats (not just cosmetic).
 * Items are earned through quests, mystery boxes, and the market.
 * Each item has a rarity, slot, and stat modifiers derived from DNA affinity.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemSlot = "accessory" | "charm" | "artifact" | "consumable";
export type StatModifier = {
  stat: "hp" | "atk" | "def" | "spd" | "int" | "cha" | "luk";
  value: number;
  /** Percentage-based modifier (true) vs flat (false) */
  percent: boolean;
};

export interface Item {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  rarity: ItemRarity;
  slot: ItemSlot;
  icon: string;
  modifiers: StatModifier[];
  /** DNA axis affinity — bonus when creature has high value in this axis */
  dnaAffinity?: keyof CreatureDNA;
  /** Minimum gen level to equip */
  minGenLevel?: number;
  /** Sell value in coins */
  sellValue: number;
}

export interface EquippedItems {
  accessory: string | null;
  charm: string | null;
  artifact: string | null;
}

/** Max inventory size */
export const MAX_INVENTORY_SIZE = 50;

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
};

const RARITY_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 7,
};

export function getRarityColor(rarity: ItemRarity): string {
  return RARITY_COLORS[rarity];
}

export function getRarityMultiplier(rarity: ItemRarity): number {
  return RARITY_MULTIPLIER[rarity];
}

// ── Item Templates ──

export const ITEM_CATALOG: Item[] = [
  // Accessories
  {
    id: "crystal_pendant",
    name: { ko: "수정 펜던트", en: "Crystal Pendant" },
    description: { ko: "맑은 기운이 지능을 높여줍니다", en: "Clear energy boosts intelligence" },
    rarity: "common",
    slot: "accessory",
    icon: "💎",
    modifiers: [{ stat: "int", value: 5, percent: false }],
    dnaAffinity: "analytical",
    sellValue: 10,
  },
  {
    id: "warm_scarf",
    name: { ko: "따뜻한 목도리", en: "Warm Scarf" },
    description: { ko: "따뜻함이 체력을 보호합니다", en: "Warmth protects vitality" },
    rarity: "common",
    slot: "accessory",
    icon: "🧣",
    modifiers: [{ stat: "hp", value: 8, percent: false }],
    dnaAffinity: "warmth",
    sellValue: 10,
  },
  {
    id: "swift_feather",
    name: { ko: "바람의 깃털", en: "Swift Feather" },
    description: { ko: "민첩함을 높여줍니다", en: "Enhances agility" },
    rarity: "uncommon",
    slot: "accessory",
    icon: "🪶",
    modifiers: [{ stat: "spd", value: 7, percent: false }],
    dnaAffinity: "adaptability",
    sellValue: 20,
  },
  {
    id: "guardian_shell",
    name: { ko: "수호의 껍질", en: "Guardian Shell" },
    description: { ko: "단단한 보호막", en: "Solid protection" },
    rarity: "uncommon",
    slot: "accessory",
    icon: "🛡️",
    modifiers: [{ stat: "def", value: 10, percent: false }],
    dnaAffinity: "resilience",
    sellValue: 20,
  },
  {
    id: "starlight_crown",
    name: { ko: "별빛 왕관", en: "Starlight Crown" },
    description: { ko: "카리스마를 크게 높여줍니다", en: "Greatly boosts charisma" },
    rarity: "rare",
    slot: "accessory",
    icon: "👑",
    modifiers: [
      { stat: "cha", value: 12, percent: false },
      { stat: "luk", value: 5, percent: false },
    ],
    dnaAffinity: "expressiveness",
    sellValue: 50,
  },
  // Charms
  {
    id: "lucky_clover",
    name: { ko: "행운의 클로버", en: "Lucky Clover" },
    description: { ko: "행운이 따릅니다", en: "Fortune follows" },
    rarity: "common",
    slot: "charm",
    icon: "🍀",
    modifiers: [{ stat: "luk", value: 8, percent: false }],
    sellValue: 10,
  },
  {
    id: "courage_flame",
    name: { ko: "용기의 불꽃", en: "Courage Flame" },
    description: { ko: "공격력을 강화합니다", en: "Strengthens attack" },
    rarity: "uncommon",
    slot: "charm",
    icon: "🔥",
    modifiers: [{ stat: "atk", value: 8, percent: false }],
    dnaAffinity: "intensity",
    sellValue: 20,
  },
  {
    id: "wisdom_tome",
    name: { ko: "지혜의 서", en: "Tome of Wisdom" },
    description: { ko: "깊은 지식의 힘", en: "Power of deep knowledge" },
    rarity: "rare",
    slot: "charm",
    icon: "📕",
    modifiers: [
      { stat: "int", value: 10, percent: false },
      { stat: "def", value: 5, percent: false },
    ],
    dnaAffinity: "curiosity",
    sellValue: 50,
  },
  {
    id: "harmony_bell",
    name: { ko: "조화의 종", en: "Harmony Bell" },
    description: { ko: "모든 스탯이 조금씩 오릅니다", en: "Slightly boosts all stats" },
    rarity: "epic",
    slot: "charm",
    icon: "🔔",
    modifiers: [
      { stat: "hp", value: 3, percent: true },
      { stat: "atk", value: 3, percent: true },
      { stat: "def", value: 3, percent: true },
      { stat: "spd", value: 3, percent: true },
    ],
    dnaAffinity: "stability",
    sellValue: 120,
  },
  // Artifacts
  {
    id: "ancient_core",
    name: { ko: "고대의 핵", en: "Ancient Core" },
    description: { ko: "잠든 힘이 깨어납니다", en: "Dormant power awakens" },
    rarity: "epic",
    slot: "artifact",
    icon: "🔮",
    modifiers: [
      { stat: "atk", value: 8, percent: true },
      { stat: "int", value: 8, percent: true },
    ],
    minGenLevel: 3,
    sellValue: 150,
  },
  {
    id: "void_shard",
    name: { ko: "공허의 파편", en: "Void Shard" },
    description: { ko: "현실을 초월하는 힘", en: "Power transcending reality" },
    rarity: "legendary",
    slot: "artifact",
    icon: "🌑",
    modifiers: [
      { stat: "hp", value: 10, percent: true },
      { stat: "atk", value: 10, percent: true },
      { stat: "def", value: 10, percent: true },
      { stat: "spd", value: 5, percent: true },
      { stat: "int", value: 5, percent: true },
      { stat: "cha", value: 5, percent: true },
      { stat: "luk", value: 5, percent: true },
    ],
    minGenLevel: 5,
    sellValue: 500,
  },
  // Consumables
  {
    id: "vitality_potion",
    name: { ko: "활력 물약", en: "Vitality Potion" },
    description: { ko: "활력을 즉시 회복합니다", en: "Instantly restores vitality" },
    rarity: "common",
    slot: "consumable",
    icon: "🧪",
    modifiers: [],
    sellValue: 5,
  },
  {
    id: "exp_boost_elixir",
    name: { ko: "경험치 부스트 엘릭서", en: "EXP Boost Elixir" },
    description: { ko: "1시간 동안 경험치 2배", en: "2x EXP for 1 hour" },
    rarity: "rare",
    slot: "consumable",
    icon: "⚗️",
    modifiers: [],
    sellValue: 40,
  },
];

/**
 * Calculate effective stat modifiers from equipped items,
 * applying DNA affinity bonuses.
 */
export function calculateEquipmentBonus(
  equipped: EquippedItems,
  dna: CreatureDNA,
): StatModifier[] {
  const allModifiers: StatModifier[] = [];

  for (const [, itemId] of Object.entries(equipped)) {
    if (!itemId) continue;
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!item) continue;

    for (const mod of item.modifiers) {
      let value = mod.value;
      // DNA affinity bonus: +20% if creature has high affinity axis
      if (item.dnaAffinity && dna[item.dnaAffinity] >= 0.7) {
        value = Math.round(value * 1.2);
      }
      allModifiers.push({ ...mod, value });
    }
  }

  return allModifiers;
}

/**
 * Roll a random item from the catalog based on rarity weights.
 * Used by mystery box and quest rewards.
 *
 * @param rarityBoost  Additive bonus applied to rare/epic/legendary weights
 * @param pityOverride When provided by the pity system, forces minimum rarity
 *                     to "epic" or "legendary" regardless of the random roll
 */
export function rollRandomItem(
  rarityBoost = 0,
  pityOverride?: "epic" | "legendary" | null,
): Item {
  // If pity system forces a rarity, pick directly from that tier (or higher)
  if (pityOverride === "legendary") {
    const candidates = ITEM_CATALOG.filter((item) => item.rarity === "legendary");
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    // Fallback to epic if no legendary items exist
    const epicFallback = ITEM_CATALOG.filter((item) => item.rarity === "epic");
    if (epicFallback.length > 0) {
      return epicFallback[Math.floor(Math.random() * epicFallback.length)];
    }
  }

  if (pityOverride === "epic") {
    // Guaranteed epic or better — roll between epic and legendary
    const epicOrBetter = ITEM_CATALOG.filter(
      (item) => item.rarity === "epic" || item.rarity === "legendary",
    );
    if (epicOrBetter.length > 0) {
      // 80% epic, 20% legendary among the pity-guaranteed pool
      const legendaries = epicOrBetter.filter((i) => i.rarity === "legendary");
      const epics = epicOrBetter.filter((i) => i.rarity === "epic");
      if (legendaries.length > 0 && Math.random() < 0.2) {
        return legendaries[Math.floor(Math.random() * legendaries.length)];
      }
      if (epics.length > 0) {
        return epics[Math.floor(Math.random() * epics.length)];
      }
      return epicOrBetter[Math.floor(Math.random() * epicOrBetter.length)];
    }
  }

  const weights: Record<ItemRarity, number> = {
    common: 50,
    uncommon: 30,
    rare: 15 + rarityBoost,
    epic: 4 + rarityBoost * 0.5,
    legendary: 1 + rarityBoost * 0.2,
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  let selectedRarity: ItemRarity = "common";

  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) {
      selectedRarity = rarity as ItemRarity;
      break;
    }
  }

  const candidates = ITEM_CATALOG.filter((item) => item.rarity === selectedRarity);
  if (candidates.length === 0) {
    return ITEM_CATALOG[0]; // fallback
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Persistence keys */
const STORAGE_KEYS = {
  inventory: "gyeol_item_inventory_v1",
  equipped: "gyeol_equipped_items_v1",
} as const;

export function readItemInventory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.inventory);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeItemInventory(items: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(items.slice(0, MAX_INVENTORY_SIZE)));
}

export function readEquippedItems(): EquippedItems {
  if (typeof window === "undefined") return { accessory: null, charm: null, artifact: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.equipped);
    if (!raw) return { accessory: null, charm: null, artifact: null };
    const parsed = JSON.parse(raw);
    return {
      accessory: parsed.accessory ?? null,
      charm: parsed.charm ?? null,
      artifact: parsed.artifact ?? null,
    };
  } catch {
    return { accessory: null, charm: null, artifact: null };
  }
}

export function writeEquippedItems(equipped: EquippedItems): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.equipped, JSON.stringify(equipped));
}

/**
 * Equip an item. Returns updated equipped items and inventory.
 * If the slot is occupied, the old item goes back to inventory.
 */
export function equipItem(
  itemId: string,
  inventory: string[],
  equipped: EquippedItems,
): { inventory: string[]; equipped: EquippedItems } | { error: string } {
  const item = ITEM_CATALOG.find((i) => i.id === itemId);
  if (!item) return { error: "Item not found" };
  if (item.slot === "consumable") return { error: "Cannot equip consumables" };

  const idx = inventory.indexOf(itemId);
  if (idx === -1) return { error: "Item not in inventory" };

  const newInventory = [...inventory];
  newInventory.splice(idx, 1);

  // Unequip current item in this slot
  const currentItem = equipped[item.slot];
  if (currentItem) {
    newInventory.push(currentItem);
  }

  const newEquipped = { ...equipped, [item.slot]: itemId };

  return { inventory: newInventory, equipped: newEquipped };
}

/**
 * Unequip an item. Returns it to inventory.
 */
export function unequipItem(
  slot: keyof EquippedItems,
  inventory: string[],
  equipped: EquippedItems,
): { inventory: string[]; equipped: EquippedItems } {
  const itemId = equipped[slot];
  if (!itemId) return { inventory, equipped };

  return {
    inventory: [...inventory, itemId],
    equipped: { ...equipped, [slot]: null },
  };
}
