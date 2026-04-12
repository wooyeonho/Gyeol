/**
 * Diablo-style Affix System — procedural item generation with random modifiers.
 *
 * Items can roll prefix + suffix affixes that modify stats.
 * Higher rarity = more affix slots.
 */

import type { StatKey } from "./stat-system";
import type { Item, ItemRarity, ItemSlot } from "./item-system";
import { RARITY_ORDER } from "./item-system";

export interface Affix {
  id: string;
  name: { ko: string; en: string };
  type: "prefix" | "suffix";
  statBonuses: Partial<Record<StatKey, number>>;
  minRarity: ItemRarity;
}

export interface ProceduralItem extends Item {
  affixes: Affix[];
  itemLevel: number;
  seed: string;
}

const PREFIXES: Affix[] = [
  { id: "fierce", name: { ko: "맹렬한", en: "Fierce" }, type: "prefix", statBonuses: { atk: 5 }, minRarity: "common" },
  { id: "sturdy", name: { ko: "견고한", en: "Sturdy" }, type: "prefix", statBonuses: { def: 5 }, minRarity: "common" },
  { id: "swift", name: { ko: "신속한", en: "Swift" }, type: "prefix", statBonuses: { spd: 5 }, minRarity: "common" },
  { id: "arcane", name: { ko: "신비한", en: "Arcane" }, type: "prefix", statBonuses: { wis: 6 }, minRarity: "uncommon" },
  { id: "blazing", name: { ko: "타오르는", en: "Blazing" }, type: "prefix", statBonuses: { atk: 10, spd: 3 }, minRarity: "rare" },
  { id: "celestial", name: { ko: "천상의", en: "Celestial" }, type: "prefix", statBonuses: { wis: 12, cha: 5 }, minRarity: "epic" },
  { id: "void", name: { ko: "공허의", en: "Void" }, type: "prefix", statBonuses: { atk: 15, wis: 8 }, minRarity: "legendary" },
];

const SUFFIXES: Affix[] = [
  { id: "of_vitality", name: { ko: "생명의", en: "of Vitality" }, type: "suffix", statBonuses: { hp: 8 }, minRarity: "common" },
  { id: "of_thorns", name: { ko: "가시의", en: "of Thorns" }, type: "suffix", statBonuses: { def: 4, atk: 2 }, minRarity: "common" },
  { id: "of_wind", name: { ko: "바람의", en: "of Wind" }, type: "suffix", statBonuses: { spd: 6 }, minRarity: "uncommon" },
  { id: "of_insight", name: { ko: "통찰의", en: "of Insight" }, type: "suffix", statBonuses: { wis: 7, cha: 3 }, minRarity: "rare" },
  { id: "of_eternity", name: { ko: "영원의", en: "of Eternity" }, type: "suffix", statBonuses: { hp: 15, def: 8 }, minRarity: "epic" },
  { id: "of_cosmos", name: { ko: "우주의", en: "of Cosmos" }, type: "suffix", statBonuses: { hp: 20, atk: 10, wis: 10 }, minRarity: "legendary" },
];

/** Seeded PRNG (simple but deterministic) */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 16807 + 0) % 2147483647;
    return (h & 0x7fffffff) / 2147483647;
  };
}

/** How many affix slots per rarity */
function affixSlots(rarity: ItemRarity): { prefix: number; suffix: number } {
  switch (rarity) {
    case "common": return { prefix: 0, suffix: 0 };
    case "uncommon": return { prefix: 1, suffix: 0 };
    case "rare": return { prefix: 1, suffix: 1 };
    case "epic": return { prefix: 2, suffix: 1 };
    case "legendary": return { prefix: 2, suffix: 2 };
  }
}

function pickAffixes(pool: Affix[], count: number, rarity: ItemRarity, rng: () => number): Affix[] {
  const eligible = pool.filter((a) => RARITY_ORDER[a.minRarity] <= RARITY_ORDER[rarity]);
  const picked: Affix[] = [];
  const remaining = [...eligible];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = Math.floor(rng() * remaining.length);
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return picked;
}

const BASE_NAMES: Record<ItemSlot, { name: string; icon: string; description: string }[]> = {
  head: [
    { name: "Helm", icon: "⛑️", description: "A protective headpiece." },
    { name: "Crown", icon: "👑", description: "A regal headpiece." },
    { name: "Hood", icon: "🧢", description: "A shadowy hood." },
  ],
  body: [
    { name: "Armor", icon: "🦺", description: "Protective body armor." },
    { name: "Robe", icon: "👘", description: "A flowing robe." },
    { name: "Cloak", icon: "🧥", description: "A mysterious cloak." },
  ],
  accessory: [
    { name: "Ring", icon: "💍", description: "A magical ring." },
    { name: "Amulet", icon: "📿", description: "An enchanted amulet." },
    { name: "Charm", icon: "🪵", description: "A lucky charm." },
  ],
  companion: [
    { name: "Spirit", icon: "✨", description: "A companion spirit." },
    { name: "Familiar", icon: "🦊", description: "A loyal familiar." },
  ],
};

/**
 * Generate a procedural item with random affixes based on a seed.
 */
export function generateProceduralItem(seed: string, itemLevel: number): ProceduralItem {
  const rng = seededRandom(seed);

  // Determine rarity based on item level + RNG
  const rarityRoll = rng();
  let rarity: ItemRarity;
  if (rarityRoll < 0.01 + itemLevel * 0.002) rarity = "legendary";
  else if (rarityRoll < 0.05 + itemLevel * 0.005) rarity = "epic";
  else if (rarityRoll < 0.15 + itemLevel * 0.01) rarity = "rare";
  else if (rarityRoll < 0.40 + itemLevel * 0.01) rarity = "uncommon";
  else rarity = "common";

  // Pick slot
  const slots: ItemSlot[] = ["head", "body", "accessory", "companion"];
  const slot = slots[Math.floor(rng() * slots.length)];

  // Pick base item
  const bases = BASE_NAMES[slot];
  const base = bases[Math.floor(rng() * bases.length)];

  // Roll affixes
  const { prefix: prefixCount, suffix: suffixCount } = affixSlots(rarity);
  const prefixes = pickAffixes(PREFIXES, prefixCount, rarity, rng);
  const suffixes = pickAffixes(SUFFIXES, suffixCount, rarity, rng);
  const affixes = [...prefixes, ...suffixes];

  // Merge stat bonuses
  const statBonuses: Partial<Record<StatKey, number>> = {};
  // Base stats scale with level
  const levelScale = 1 + itemLevel * 0.1;
  statBonuses.hp = Math.round(3 * levelScale);

  for (const affix of affixes) {
    for (const [stat, value] of Object.entries(affix.statBonuses)) {
      const key = stat as StatKey;
      statBonuses[key] = (statBonuses[key] ?? 0) + Math.round(value * levelScale);
    }
  }

  // Build name
  const prefixName = prefixes.map((a) => a.name.en).join(" ");
  const suffixName = suffixes.map((a) => a.name.en).join(" ");
  const fullName = [prefixName, base.name, suffixName].filter(Boolean).join(" ");

  return {
    id: `proc_${seed}`,
    name: fullName,
    description: base.description,
    rarity,
    slot,
    statBonuses,
    icon: base.icon,
    affixes,
    itemLevel,
    seed,
  };
}

export { PREFIXES, SUFFIXES };
