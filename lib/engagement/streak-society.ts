/**
 * Streak Society — tiered rewards for consecutive daily engagement.
 *
 * Bronze (7+ days) → Silver (30+) → Gold (90+) → Diamond (365+)
 * Each tier unlocks exclusive perks and visual badges.
 */

export type StreakSocietyTier = "none" | "bronze" | "silver" | "gold" | "diamond";

export interface StreakSocietyMembership {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  tier: StreakSocietyTier;
  joinedAt: string | null;
  perks: string[];
}

export interface StreakTierConfig {
  tier: StreakSocietyTier;
  minDays: number;
  icon: string;
  label: { ko: string; en: string };
  perks: { ko: string; en: string }[];
  bonusCoins: number;
  bonusXp: number;
}

export const STREAK_TIERS: StreakTierConfig[] = [
  {
    tier: "bronze",
    minDays: 7,
    icon: "🥉",
    label: { ko: "브론즈", en: "Bronze" },
    perks: [
      { ko: "프로필 브론즈 뱃지", en: "Bronze profile badge" },
      { ko: "일일 보너스 코인 +10%", en: "+10% daily bonus coins" },
    ],
    bonusCoins: 5,
    bonusXp: 10,
  },
  {
    tier: "silver",
    minDays: 30,
    icon: "🥈",
    label: { ko: "실버", en: "Silver" },
    perks: [
      { ko: "프로필 실버 뱃지", en: "Silver profile badge" },
      { ko: "일일 보너스 코인 +25%", en: "+25% daily bonus coins" },
      { ko: "전용 크리처 색상", en: "Exclusive creature colors" },
    ],
    bonusCoins: 15,
    bonusXp: 25,
  },
  {
    tier: "gold",
    minDays: 90,
    icon: "🥇",
    label: { ko: "골드", en: "Gold" },
    perks: [
      { ko: "프로필 골드 뱃지", en: "Gold profile badge" },
      { ko: "일일 보너스 코인 +50%", en: "+50% daily bonus coins" },
      { ko: "전용 진화 경로", en: "Exclusive evolution paths" },
      { ko: "교배 우선권", en: "Breeding priority" },
    ],
    bonusCoins: 30,
    bonusXp: 50,
  },
  {
    tier: "diamond",
    minDays: 365,
    icon: "💎",
    label: { ko: "다이아몬드", en: "Diamond" },
    perks: [
      { ko: "프로필 다이아 뱃지", en: "Diamond profile badge" },
      { ko: "일일 보너스 코인 +100%", en: "+100% daily bonus coins" },
      { ko: "전용 미식 크리처", en: "Mythic creature access" },
      { ko: "VIP 이벤트 초대", en: "VIP event invitations" },
      { ko: "프리미엄 사운드스케이프", en: "Premium soundscapes" },
    ],
    bonusCoins: 50,
    bonusXp: 100,
  },
];

export function computeStreakTier(days: number): StreakSocietyTier {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (days >= STREAK_TIERS[i].minDays) return STREAK_TIERS[i].tier;
  }
  return "none";
}

export function getStreakTierConfig(tier: StreakSocietyTier): StreakTierConfig | null {
  return STREAK_TIERS.find((t) => t.tier === tier) ?? null;
}

export function computeStreakBonus(days: number): { coins: number; xp: number } {
  const tier = computeStreakTier(days);
  const config = getStreakTierConfig(tier);
  return {
    coins: config?.bonusCoins ?? 0,
    xp: config?.bonusXp ?? 0,
  };
}

export function getNextTierProgress(days: number): { nextTier: StreakSocietyTier; daysRemaining: number; progress: number } | null {
  const currentTier = computeStreakTier(days);
  const currentIdx = STREAK_TIERS.findIndex((t) => t.tier === currentTier);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= STREAK_TIERS.length) return null;

  const next = STREAK_TIERS[nextIdx];
  const prevMin = currentIdx >= 0 ? STREAK_TIERS[currentIdx].minDays : 0;
  const range = next.minDays - prevMin;
  const progress = Math.min(1, (days - prevMin) / range);

  return {
    nextTier: next.tier,
    daysRemaining: next.minDays - days,
    progress,
  };
}
