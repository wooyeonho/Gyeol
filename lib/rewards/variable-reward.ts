/**
 * Variable reward engine for Phase 2.
 *
 * Goals:
 * - Users should receive *something* almost every message
 * - Longer streaks should materially increase value
 * - UI should always be able to show "next reward in N messages"
 */

export type RewardTier = "none" | "small" | "medium" | "large" | "jackpot";
export type RewardSource = "message" | "daily_login" | "weekly_event";

export type RewardInventory = {
  coins: number;
  emoji_dust: number;
  title_shards: number;
  appearance_shards: number;
  evolution_points: number;
  streak_freezes: number;
};

export type RewardProgress = {
  guaranteedEvery: number;
  messagesSinceReward: number;
  messagesUntilGuaranteed: number;
  streakMultiplier: number;
};

export type RewardResult = {
  tier: RewardTier;
  source: RewardSource;
  label: { ko: string; en: string };
  detail: { ko: string; en: string };
  icon: string;
  delta: Partial<RewardInventory>;
  streakMultiplier: number;
  guaranteed: boolean;
};

type RewardTableEntry = {
  tier: RewardTier;
  weight: number;
  icon: string;
  label: { ko: string; en: string };
  detail: { ko: string; en: string };
  delta: Partial<RewardInventory>;
  scalesWithStreak?: Array<keyof RewardInventory>;
};

const REWARD_STORAGE_KEYS = {
  inventory: "gyeol_reward_inventory_v1",
  messagesSinceReward: "gyeol_reward_messages_since_reward_v1",
  dailyLoginDate: "gyeol_daily_login_bonus_date_v1",
  comebackMultiplier: "gyeol_comeback_multiplier_v1",
  lastRewardAt: "gyeol_last_reward_at_v1",
} as const;

const GUARANTEED_REWARD_EVERY = 6;

const EMPTY_INVENTORY: RewardInventory = {
  coins: 0,
  emoji_dust: 0,
  title_shards: 0,
  appearance_shards: 0,
  evolution_points: 0,
  streak_freezes: 0,
};

const REWARD_TABLE: RewardTableEntry[] = [
  {
    tier: "none",
    weight: 5,
    icon: "",
    label: { ko: "", en: "" },
    detail: { ko: "", en: "" },
    delta: {},
  },
  {
    tier: "small",
    weight: 22,
    icon: "🪙",
    label: { ko: "코인 보상", en: "Coin reward" },
    detail: { ko: "짧은 대화도 보상 루프를 채웁니다.", en: "Even a short message keeps the reward loop moving." },
    delta: { coins: 6 },
    scalesWithStreak: ["coins"],
  },
  {
    tier: "small",
    weight: 18,
    icon: "✨",
    label: { ko: "이모지 더스트", en: "Emoji dust" },
    detail: { ko: "가벼운 꾸미기 재료가 쌓였습니다.", en: "A little cosmetic dust was added." },
    delta: { emoji_dust: 2 },
  },
  {
    tier: "medium",
    weight: 16,
    icon: "🏷️",
    label: { ko: "칭호 조각", en: "Title shard" },
    detail: { ko: "새 칭호를 향한 조각이 하나 모였습니다.", en: "A shard toward a new title has been collected." },
    delta: { title_shards: 1 },
  },
  {
    tier: "medium",
    weight: 14,
    icon: "🧩",
    label: { ko: "외형 조각", en: "Appearance shard" },
    detail: { ko: "새 외형 조각이 인벤토리에 추가되었습니다.", en: "A new appearance shard was added to inventory." },
    delta: { appearance_shards: 1 },
  },
  {
    tier: "medium",
    weight: 12,
    icon: "🧬",
    label: { ko: "진화 포인트", en: "Evolution point" },
    detail: { ko: "진화 진행을 밀어주는 포인트를 얻었습니다.", en: "You earned points that push evolution forward." },
    delta: { evolution_points: 2 },
    scalesWithStreak: ["evolution_points"],
  },
  {
    tier: "large",
    weight: 8,
    icon: "💎",
    label: { ko: "희귀 코인 팩", en: "Rare coin pack" },
    detail: { ko: "스트릭 배수까지 반영된 큰 코인 팩입니다.", en: "A larger coin pack boosted by your streak multiplier." },
    delta: { coins: 18 },
    scalesWithStreak: ["coins"],
  },
  {
    tier: "large",
    weight: 3,
    icon: "🧊",
    label: { ko: "스트릭 프리즈", en: "Streak freeze" },
    detail: { ko: "이번 주 스트릭을 한 번 지킬 수 있는 프리즈입니다.", en: "A freeze that can protect one streak this week." },
    delta: { streak_freezes: 1 },
  },
  {
    tier: "jackpot",
    weight: 2,
    icon: "🏆",
    label: { ko: "잭팟!", en: "Jackpot!" },
    detail: { ko: "코인, 조각, 진화 포인트를 한 번에 획득했습니다.", en: "Coins, shards, and evolution points dropped together." },
    delta: { coins: 60, title_shards: 2, appearance_shards: 2, evolution_points: 5 },
    scalesWithStreak: ["coins", "evolution_points"],
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function roundScaledValue(value: number, multiplier: number) {
  return Math.max(1, Math.round(value * multiplier));
}

function pickWeightedEntry(entries: RewardTableEntry[]) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1];
}

function scaleRewardDelta(
  delta: Partial<RewardInventory>,
  keys: Array<keyof RewardInventory> | undefined,
  multiplier: number,
) {
  if (!keys || keys.length === 0 || multiplier === 1) {
    return { ...delta };
  }

  const next: Partial<RewardInventory> = { ...delta };
  for (const key of keys) {
    const current = next[key];
    if (typeof current === "number" && current > 0) {
      next[key] = roundScaledValue(current, multiplier);
    }
  }
  return next;
}

function readStorageString(key: string) {
  if (!isBrowser()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageString(key: string, value: string) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage write errors in restricted environments.
  }
}

export function createEmptyRewardInventory(): RewardInventory {
  return { ...EMPTY_INVENTORY };
}

export function readRewardInventory(): RewardInventory {
  const raw = readStorageString(REWARD_STORAGE_KEYS.inventory);
  if (!raw) return createEmptyRewardInventory();

  try {
    const parsed = JSON.parse(raw) as Partial<RewardInventory>;
    return {
      coins: typeof parsed.coins === "number" ? parsed.coins : 0,
      emoji_dust: typeof parsed.emoji_dust === "number" ? parsed.emoji_dust : 0,
      title_shards: typeof parsed.title_shards === "number" ? parsed.title_shards : 0,
      appearance_shards: typeof parsed.appearance_shards === "number" ? parsed.appearance_shards : 0,
      evolution_points: typeof parsed.evolution_points === "number" ? parsed.evolution_points : 0,
      streak_freezes: typeof parsed.streak_freezes === "number" ? parsed.streak_freezes : 0,
    };
  } catch {
    return createEmptyRewardInventory();
  }
}

export function writeRewardInventory(inventory: RewardInventory) {
  writeStorageString(REWARD_STORAGE_KEYS.inventory, JSON.stringify(inventory));
}

export function readMessagesSinceReward() {
  const raw = readStorageString(REWARD_STORAGE_KEYS.messagesSinceReward);
  if (!raw) return 0;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function writeMessagesSinceReward(count: number) {
  writeStorageString(REWARD_STORAGE_KEYS.messagesSinceReward, String(Math.max(0, count)));
}

export function getStreakRewardMultiplier(streakDays: number) {
  if (streakDays >= 30) return 3;
  if (streakDays >= 7) return 2;
  if (streakDays >= 3) return 1.5;
  return 1;
}

/**
 * Compute an effective reward multiplier that accounts for both the
 * regular streak bonus AND the comeback bonus for returning users.
 *
 * Tiers:
 *   3-6 days absent  → 2x
 *   7-13 days absent  → 3x
 *   14+ days absent   → 5x
 *
 * The comeback multiplier replaces (not stacks with) the streak
 * multiplier when it is higher, ensuring returning users always
 * receive the best possible rate.
 */
export function getEffectiveMultiplier(
  streakDays: number,
  comebackMultiplier = 1,
): number {
  const streakMul = getStreakRewardMultiplier(streakDays);
  return Math.max(streakMul, comebackMultiplier);
}

export function getRewardProgress(messagesSinceReward: number, streakDays = 0): RewardProgress {
  const guaranteedEvery = GUARANTEED_REWARD_EVERY;
  return {
    guaranteedEvery,
    messagesSinceReward,
    messagesUntilGuaranteed: Math.max(0, guaranteedEvery - messagesSinceReward),
    streakMultiplier: getStreakRewardMultiplier(streakDays),
  };
}

export function applyRewardToInventory(
  inventory: RewardInventory,
  reward: Pick<RewardResult, "delta">,
): RewardInventory {
  return {
    coins: inventory.coins + (reward.delta.coins ?? 0),
    emoji_dust: inventory.emoji_dust + (reward.delta.emoji_dust ?? 0),
    title_shards: inventory.title_shards + (reward.delta.title_shards ?? 0),
    appearance_shards: inventory.appearance_shards + (reward.delta.appearance_shards ?? 0),
    evolution_points: inventory.evolution_points + (reward.delta.evolution_points ?? 0),
    streak_freezes: inventory.streak_freezes + (reward.delta.streak_freezes ?? 0),
  };
}

export function createDailyLoginReward(streakDays = 0): RewardResult {
  const streakMultiplier = getStreakRewardMultiplier(streakDays);
  const coins = roundScaledValue(1, streakMultiplier);

  return {
    tier: "small",
    source: "daily_login",
    label: {
      ko: "일일 로그인 보너스",
      en: "Daily login bonus",
    },
    detail: {
      ko: "앱을 연 것만으로 코인을 받았습니다.",
      en: "You earned coins just for showing up today.",
    },
    icon: "📅",
    delta: { coins },
    streakMultiplier,
    guaranteed: true,
  };
}

export function createWeeklyEventReward(streakDays = 0): RewardResult {
  const streakMultiplier = getStreakRewardMultiplier(streakDays);

  return {
    tier: "large",
    source: "weekly_event",
    label: {
      ko: "주간 이벤트 완료!",
      en: "Weekly event complete!",
    },
    detail: {
      ko: "이번 주 메시지 챌린지를 달성해 특별 보상을 받았습니다.",
      en: "You completed this week's message challenge and unlocked a special drop.",
    },
    icon: "🎉",
    delta: {
      coins: roundScaledValue(24, streakMultiplier),
      title_shards: 1,
      appearance_shards: 1,
      evolution_points: roundScaledValue(3, streakMultiplier),
    },
    streakMultiplier,
    guaranteed: true,
  };
}

export function hasClaimedDailyLoginBonus(date = new Date()) {
  const todayKey = date.toISOString().slice(0, 10);
  return readStorageString(REWARD_STORAGE_KEYS.dailyLoginDate) === todayKey;
}

export function markDailyLoginBonusClaimed(date = new Date()) {
  writeStorageString(REWARD_STORAGE_KEYS.dailyLoginDate, date.toISOString().slice(0, 10));
}

// ---------------------------------------------------------------------------
// Comeback multiplier persistence (client-side)
// ---------------------------------------------------------------------------

/**
 * Store the comeback multiplier in localStorage so the reward middleware
 * can apply it on the next message reward roll.
 */
export function writeComebackMultiplier(multiplier: number) {
  if (multiplier <= 1) return;
  writeStorageString(REWARD_STORAGE_KEYS.comebackMultiplier, String(multiplier));
}

/**
 * Read the stored comeback multiplier without clearing it.
 * Returns 1 (no bonus) if none is stored.
 */
export function readComebackMultiplier(): number {
  const raw = readStorageString(REWARD_STORAGE_KEYS.comebackMultiplier);
  if (!raw) return 1;
  const value = Number(raw);
  return Number.isFinite(value) && value > 1 ? value : 1;
}

/**
 * Clear the stored comeback multiplier (call after a reward is actually granted).
 */
export function clearComebackMultiplier() {
  if (isBrowser()) {
    try { window.localStorage.removeItem(REWARD_STORAGE_KEYS.comebackMultiplier); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Last reward timestamp (for expiry countdown)
// ---------------------------------------------------------------------------

/** Record when the last reward was granted (ISO string). */
export function writeLastRewardAt(date = new Date()) {
  writeStorageString(REWARD_STORAGE_KEYS.lastRewardAt, date.toISOString());
}

/** Read last reward timestamp. Returns null if never set. */
export function readLastRewardAt(): string | null {
  return readStorageString(REWARD_STORAGE_KEYS.lastRewardAt);
}

// ---------------------------------------------------------------------------
// Plan tier reward multiplier
// ---------------------------------------------------------------------------

export type PlanTierForReward = "free" | "pro" | "premium";

/**
 * Get the reward multiplier for a billing plan tier.
 *   free    → 1x
 *   pro     → 1.5x
 *   premium → 2x
 */
export function getPlanRewardMultiplier(tier: PlanTierForReward | null | undefined): number {
  if (tier === "premium") return 2;
  if (tier === "pro") return 1.5;
  return 1;
}

export function rollReward(
  streakDays = 0,
  options?: {
    forceReward?: boolean;
    source?: RewardSource;
    comebackMultiplier?: number;
  },
): RewardResult {
  const forceReward = options?.forceReward ?? false;
  const source = options?.source ?? "message";
  const comebackMul = options?.comebackMultiplier ?? 1;
  const streakMultiplier = getEffectiveMultiplier(streakDays, comebackMul);
  const streakBonus = Math.min(Math.floor(streakDays / 3), 4);

  const eligibleEntries = REWARD_TABLE
    .filter((entry) => (forceReward ? entry.tier !== "none" : true))
    .map((entry) => {
      if (entry.tier === "none") {
        return {
          ...entry,
          weight: Math.max(1, entry.weight - streakBonus),
        };
      }
      return {
        ...entry,
        weight: entry.weight + (entry.tier === "jackpot" ? Math.floor(streakBonus / 2) : streakBonus),
      };
    });

  const selected = pickWeightedEntry(eligibleEntries);
  return {
    tier: selected.tier,
    source,
    label: selected.label,
    detail: selected.detail,
    icon: selected.icon,
    delta: scaleRewardDelta(selected.delta, selected.scalesWithStreak, streakMultiplier),
    streakMultiplier,
    guaranteed: forceReward,
  };
}

/**
 * Determine whether a "mystery box" event should trigger.
 * Mystery boxes appear roughly once per 10 sessions with diminishing frequency.
 *
 * @param sessionCount  total lifetime session count for this user
 */
export function shouldShowMysteryBox(sessionCount: number): boolean {
  if (sessionCount < 3) return false;
  const chance = 0.10 * Math.max(0.3, 1 - sessionCount / 200);
  return Math.random() < chance;
}
