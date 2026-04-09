/**
 * Mystery Box / Gacha system — the "surprise delight" mechanic.
 *
 * Mystery boxes appear as surprise rewards at key moments:
 * - After completing all daily challenges (perfect day)
 * - Random drop during conversations (low probability)
 * - Weekly login streak bonus
 * - Special events
 *
 * Design: boxes have visible rarity tiers (common → legendary) which
 * creates anticipation and FOMO. Opening animation should be dramatic.
 */

export type BoxRarity = "common" | "rare" | "epic" | "legendary";

export interface MysteryBoxDrop {
  type: "coins" | "evolution_points" | "title_shard" | "appearance_shard"
    | "emoji_dust" | "streak_freeze" | "exclusive_skin" | "exclusive_title"
    | "dna_boost";
  amount: number;
  label: { ko: string; en: string };
  icon: string;
  rarity: BoxRarity;
}

export interface MysteryBox {
  id: string;
  rarity: BoxRarity;
  label: { ko: string; en: string };
  icon: string;
  drops: MysteryBoxDrop[];
  glow_color: string;
}

// ── Drop Tables ──

const COMMON_DROPS: MysteryBoxDrop[] = [
  { type: "coins", amount: 15, label: { ko: "코인", en: "Coins" }, icon: "🪙", rarity: "common" },
  { type: "emoji_dust", amount: 3, label: { ko: "이모지 더스트", en: "Emoji Dust" }, icon: "✨", rarity: "common" },
  { type: "evolution_points", amount: 2, label: { ko: "진화 포인트", en: "Evo Points" }, icon: "🧬", rarity: "common" },
];

const RARE_DROPS: MysteryBoxDrop[] = [
  { type: "coins", amount: 40, label: { ko: "코인 묶음", en: "Coin Bundle" }, icon: "💰", rarity: "rare" },
  { type: "title_shard", amount: 2, label: { ko: "칭호 조각", en: "Title Shards" }, icon: "🏷️", rarity: "rare" },
  { type: "appearance_shard", amount: 2, label: { ko: "외형 조각", en: "Appearance Shards" }, icon: "🧩", rarity: "rare" },
  { type: "streak_freeze", amount: 1, label: { ko: "스트릭 프리즈", en: "Streak Freeze" }, icon: "🧊", rarity: "rare" },
];

const EPIC_DROPS: MysteryBoxDrop[] = [
  { type: "coins", amount: 100, label: { ko: "대량 코인", en: "Mega Coins" }, icon: "💎", rarity: "epic" },
  { type: "evolution_points", amount: 15, label: { ko: "진화 부스트", en: "Evo Boost" }, icon: "🚀", rarity: "epic" },
  { type: "dna_boost", amount: 1, label: { ko: "DNA 부스트", en: "DNA Boost" }, icon: "🧪", rarity: "epic" },
  { type: "exclusive_skin", amount: 1, label: { ko: "한정 스킨", en: "Exclusive Skin" }, icon: "🎨", rarity: "epic" },
];

const LEGENDARY_DROPS: MysteryBoxDrop[] = [
  { type: "coins", amount: 300, label: { ko: "전설의 코인", en: "Legendary Coins" }, icon: "👑", rarity: "legendary" },
  { type: "exclusive_title", amount: 1, label: { ko: "전설 칭호", en: "Legendary Title" }, icon: "🌟", rarity: "legendary" },
  { type: "dna_boost", amount: 3, label: { ko: "DNA 대량 부스트", en: "DNA Mega Boost" }, icon: "⚡", rarity: "legendary" },
];

function getDropTable(rarity: BoxRarity): MysteryBoxDrop[] {
  switch (rarity) {
    case "common": return COMMON_DROPS;
    case "rare": return RARE_DROPS;
    case "epic": return EPIC_DROPS;
    case "legendary": return LEGENDARY_DROPS;
  }
}

const BOX_GLOW: Record<BoxRarity, string> = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const BOX_LABELS: Record<BoxRarity, { ko: string; en: string }> = {
  common: { ko: "일반 미스터리 박스", en: "Common Mystery Box" },
  rare: { ko: "희귀 미스터리 박스", en: "Rare Mystery Box" },
  epic: { ko: "에픽 미스터리 박스", en: "Epic Mystery Box" },
  legendary: { ko: "전설 미스터리 박스", en: "Legendary Mystery Box" },
};

const BOX_ICONS: Record<BoxRarity, string> = {
  common: "📦",
  rare: "🎁",
  epic: "💜",
  legendary: "👑",
};

// ── Pity System (Genshin-style guaranteed rarity) ──

const PITY_KEY = "gyeol_mystery_box_pity_v1";

interface PityState {
  /** Boxes opened since last epic or legendary */
  sinceEpic: number;
  /** Boxes opened since last legendary */
  sinceLegendary: number;
}

function readPityState(): PityState {
  if (typeof window === "undefined") return { sinceEpic: 0, sinceLegendary: 0 };
  try {
    const raw = window.localStorage.getItem(PITY_KEY);
    return raw ? (JSON.parse(raw) as PityState) : { sinceEpic: 0, sinceLegendary: 0 };
  } catch {
    return { sinceEpic: 0, sinceLegendary: 0 };
  }
}

function writePityState(state: PityState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PITY_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Pity thresholds — guaranteed rarity after N boxes without it */
const EPIC_PITY_THRESHOLD = 20;
const LEGENDARY_PITY_THRESHOLD = 50;

/** Soft pity — increasing chance as you approach threshold */
const LEGENDARY_SOFT_PITY_START = 35;
const EPIC_SOFT_PITY_START = 12;

/**
 * Determine box rarity based on a probability roll with pity system.
 *
 * Pity guarantees:
 * - Epic+ guaranteed every 20 boxes (soft pity starts at 12)
 * - Legendary guaranteed every 50 boxes (soft pity starts at 35)
 *
 * Base rates: common 50%, rare 30%, epic 15%, legendary 5%
 */
export function rollBoxRarity(streakDays = 0): BoxRarity {
  const pity = readPityState();
  const roll = Math.random();

  // Streak bonus: each 7 days increases legendary+epic chance slightly
  const streakBonus = Math.min(0.10, Math.floor(streakDays / 7) * 0.02);

  // Hard pity: guaranteed legendary
  if (pity.sinceLegendary >= LEGENDARY_PITY_THRESHOLD) {
    writePityState({ sinceEpic: 0, sinceLegendary: 0 });
    return "legendary";
  }

  // Hard pity: guaranteed epic+
  if (pity.sinceEpic >= EPIC_PITY_THRESHOLD) {
    const isLegendary = roll < 0.25; // 25% chance the pity-forced epic is actually legendary
    writePityState({
      sinceEpic: 0,
      sinceLegendary: isLegendary ? 0 : pity.sinceLegendary + 1,
    });
    return isLegendary ? "legendary" : "epic";
  }

  // Soft pity: increasing chance as approaching threshold
  let legendaryBoost = 0;
  if (pity.sinceLegendary >= LEGENDARY_SOFT_PITY_START) {
    legendaryBoost = (pity.sinceLegendary - LEGENDARY_SOFT_PITY_START) * 0.04;
  }
  let epicBoost = 0;
  if (pity.sinceEpic >= EPIC_SOFT_PITY_START) {
    epicBoost = (pity.sinceEpic - EPIC_SOFT_PITY_START) * 0.03;
  }

  let rarity: BoxRarity;
  if (roll < 0.05 + streakBonus * 0.5 + legendaryBoost) {
    rarity = "legendary";
  } else if (roll < 0.20 + streakBonus + epicBoost) {
    rarity = "epic";
  } else if (roll < 0.50 + streakBonus * 0.5) {
    rarity = "rare";
  } else {
    rarity = "common";
  }

  // Update pity counters
  const isEpicPlus = rarity === "epic" || rarity === "legendary";
  writePityState({
    sinceEpic: isEpicPlus ? 0 : pity.sinceEpic + 1,
    sinceLegendary: rarity === "legendary" ? 0 : pity.sinceLegendary + 1,
  });

  return rarity;
}

/** Get current pity counter for UI display */
export function getPityProgress(): { sinceEpic: number; sinceLegendary: number; epicThreshold: number; legendaryThreshold: number } {
  const pity = readPityState();
  return {
    ...pity,
    epicThreshold: EPIC_PITY_THRESHOLD,
    legendaryThreshold: LEGENDARY_PITY_THRESHOLD,
  };
}

/**
 * Generate a mystery box with random drops.
 * Each box contains 1-3 drops depending on rarity.
 */
export function generateMysteryBox(rarity?: BoxRarity, streakDays = 0): MysteryBox {
  const boxRarity = rarity ?? rollBoxRarity(streakDays);
  const dropTable = getDropTable(boxRarity);
  const dropCount = boxRarity === "legendary" ? 3 : boxRarity === "epic" ? 2 : 1;

  const drops: MysteryBoxDrop[] = [];
  const used = new Set<number>();

  for (let i = 0; i < Math.min(dropCount, dropTable.length); i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * dropTable.length);
    } while (used.has(idx));
    used.add(idx);
    drops.push({ ...dropTable[idx] });
  }

  // Streak multiplier for coin drops
  const streakMultiplier = streakDays >= 30 ? 2 : streakDays >= 7 ? 1.5 : 1;
  for (const drop of drops) {
    if (drop.type === "coins") {
      drop.amount = Math.round(drop.amount * streakMultiplier);
    }
  }

  return {
    id: `box_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rarity: boxRarity,
    label: BOX_LABELS[boxRarity],
    icon: BOX_ICONS[boxRarity],
    drops,
    glow_color: BOX_GLOW[boxRarity],
  };
}

/**
 * Determine whether to trigger a mystery box drop.
 * Called after each message. Higher chance at special moments.
 */
export function shouldDropMysteryBox(context: {
  messageCount: number;
  streakDays: number;
  perfectDayCompleted?: boolean;
  sessionMessageCount: number;
}): boolean {
  // Perfect day completion always drops a box
  if (context.perfectDayCompleted) return true;

  // No drops in first few messages of a session
  if (context.sessionMessageCount < 5) return false;

  // Base chance: 2% per message
  let chance = 0.02;

  // Bonus: every 50 lifetime messages increases base slightly
  chance += Math.min(0.03, Math.floor(context.messageCount / 50) * 0.002);

  // Bonus: longer streaks
  chance += Math.min(0.02, context.streakDays * 0.001);

  return Math.random() < chance;
}

// ── Storage ──

const PENDING_BOXES_KEY = "gyeol_pending_mystery_boxes_v1";

export function readPendingBoxes(): MysteryBox[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_BOXES_KEY);
    return raw ? (JSON.parse(raw) as MysteryBox[]) : [];
  } catch {
    return [];
  }
}

export function writePendingBoxes(boxes: MysteryBox[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_BOXES_KEY, JSON.stringify(boxes));
  } catch {
    // Ignore localStorage errors.
  }
}

export function addPendingBox(box: MysteryBox): void {
  const boxes = readPendingBoxes();
  boxes.push(box);
  writePendingBoxes(boxes);
}

export function popPendingBox(): MysteryBox | null {
  const boxes = readPendingBoxes();
  if (boxes.length === 0) return null;
  const box = boxes.shift()!;
  writePendingBoxes(boxes);
  return box;
}
