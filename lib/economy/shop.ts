/**
 * Shop catalog — spend shards, dust, and evolution points on cosmetics & upgrades.
 *
 * All spending happens client-side (localStorage inventory) for now.
 * Server-side coins are handled separately via `spendCoinsAtomic`.
 */

import {
  type RewardInventory,
  readRewardInventory,
  writeRewardInventory,
} from "@/lib/rewards/variable-reward";

export type ShopCurrency = keyof Omit<RewardInventory, "coins">;

export type ShopItemId =
  | "title_common"
  | "title_rare"
  | "appearance_glow"
  | "appearance_particles"
  | "appearance_aura"
  | "evo_boost_small"
  | "evo_boost_large"
  | "streak_freeze_use"
  | "emoji_react_pack";

export type ShopItem = {
  id: ShopItemId;
  icon: string;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  cost: Partial<Record<ShopCurrency, number>>;
  category: "title" | "appearance" | "evolution" | "utility";
};

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: "title_common",
    icon: "🏷️",
    label: { ko: "일반 칭호 해금", en: "Unlock common title" },
    description: { ko: "칭호 조각 3개로 새 칭호를 해금합니다.", en: "Unlock a new title with 3 title shards." },
    cost: { title_shards: 3 },
    category: "title",
  },
  {
    id: "title_rare",
    icon: "👑",
    label: { ko: "희귀 칭호 해금", en: "Unlock rare title" },
    description: { ko: "칭호 조각 8개로 희귀 칭호를 해금합니다.", en: "Unlock a rare title with 8 title shards." },
    cost: { title_shards: 8 },
    category: "title",
  },
  {
    id: "appearance_glow",
    icon: "✨",
    label: { ko: "글로우 이펙트", en: "Glow effect" },
    description: { ko: "외형 조각 2개로 존재에 빛 이펙트를 추가합니다.", en: "Add a glow effect to your being with 2 appearance shards." },
    cost: { appearance_shards: 2 },
    category: "appearance",
  },
  {
    id: "appearance_particles",
    icon: "🌟",
    label: { ko: "파티클 이펙트", en: "Particle effect" },
    description: { ko: "외형 조각 4개로 파티클 이펙트를 추가합니다.", en: "Add particle effects with 4 appearance shards." },
    cost: { appearance_shards: 4 },
    category: "appearance",
  },
  {
    id: "appearance_aura",
    icon: "🔮",
    label: { ko: "오라 이펙트", en: "Aura effect" },
    description: { ko: "외형 조각 6개 + 이모지 더스트 3개로 오라를 추가합니다.", en: "Add an aura with 6 appearance shards + 3 emoji dust." },
    cost: { appearance_shards: 6, emoji_dust: 3 },
    category: "appearance",
  },
  {
    id: "evo_boost_small",
    icon: "🧬",
    label: { ko: "소형 진화 부스트", en: "Small evolution boost" },
    description: { ko: "진화 포인트 5개로 진화 게이지를 올립니다.", en: "Boost evolution gauge with 5 evolution points." },
    cost: { evolution_points: 5 },
    category: "evolution",
  },
  {
    id: "evo_boost_large",
    icon: "🚀",
    label: { ko: "대형 진화 부스트", en: "Large evolution boost" },
    description: { ko: "진화 포인트 15개로 진화 게이지를 크게 올립니다.", en: "Big evolution gauge boost with 15 evolution points." },
    cost: { evolution_points: 15 },
    category: "evolution",
  },
  {
    id: "streak_freeze_use",
    icon: "🧊",
    label: { ko: "스트릭 프리즈 사용", en: "Use streak freeze" },
    description: { ko: "프리즈 1개를 사용해 오늘 스트릭을 보호합니다.", en: "Use 1 freeze to protect today's streak." },
    cost: { streak_freezes: 1 },
    category: "utility",
  },
  {
    id: "emoji_react_pack",
    icon: "🎨",
    label: { ko: "이모지 리액션 팩", en: "Emoji reaction pack" },
    description: { ko: "이모지 더스트 5개로 리액션 세트를 해금합니다.", en: "Unlock a reaction set with 5 emoji dust." },
    cost: { emoji_dust: 5 },
    category: "utility",
  },
];

export type PurchaseResult = {
  success: boolean;
  error?: string;
  updatedInventory?: RewardInventory;
};

export function canAfford(inventory: RewardInventory, item: ShopItem): boolean {
  for (const [currency, required] of Object.entries(item.cost)) {
    const key = currency as ShopCurrency;
    if ((inventory[key] ?? 0) < (required ?? 0)) return false;
  }
  return true;
}

export function purchaseShopItem(itemId: ShopItemId): PurchaseResult {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Item not found" };

  const inventory = readRewardInventory();
  if (!canAfford(inventory, item)) {
    return { success: false, error: "Insufficient resources" };
  }

  const updated: RewardInventory = { ...inventory };
  for (const [currency, required] of Object.entries(item.cost)) {
    const key = currency as ShopCurrency;
    updated[key] = Math.max(0, (updated[key] ?? 0) - (required ?? 0));
  }

  writeRewardInventory(updated);

  // Auto-activate streak freeze on purchase
  if (itemId === "streak_freeze_use") {
    activateStreakFreeze();
  }

  // Persist purchased items
  const purchasedKey = "gyeol_shop_purchased_v1";
  try {
    const existing = JSON.parse(localStorage.getItem(purchasedKey) ?? "[]") as string[];
    if (!existing.includes(itemId)) {
      existing.push(itemId);
      localStorage.setItem(purchasedKey, JSON.stringify(existing));
    }
  } catch {
    // Non-fatal
  }

  return { success: true, updatedInventory: updated };
}

export function getPurchasedItems(): string[] {
  try {
    return JSON.parse(localStorage.getItem("gyeol_shop_purchased_v1") ?? "[]") as string[];
  } catch {
    return [];
  }
}

// ── Streak Freeze Activation ──

const STREAK_FREEZE_KEY = "gyeol_streak_freeze_active_v1";

/**
 * Activate a streak freeze for the current day.
 * Called after purchasing "streak_freeze_use" from the shop.
 * Stores today's date so the server can check whether a freeze covers a gap.
 */
export function activateStreakFreeze(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const existing = JSON.parse(localStorage.getItem(STREAK_FREEZE_KEY) ?? "[]") as string[];
    if (!existing.includes(today)) {
      existing.push(today);
      // Keep only the last 7 days of freezes
      const recent = existing.slice(-7);
      localStorage.setItem(STREAK_FREEZE_KEY, JSON.stringify(recent));
    }
  } catch { /* non-fatal */ }
}

/**
 * Get all active streak freeze dates (YYYY-MM-DD).
 */
export function getStreakFreezeDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STREAK_FREEZE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
