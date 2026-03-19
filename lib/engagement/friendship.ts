/**
 * Friendship Milestone system — social bonds that drive retention.
 *
 * When two users interact (follow, react, gift), their friendship score grows.
 * Milestones unlock shared benefits: breeding priority, duo streaks, combo rewards.
 *
 * This creates a social obligation loop: "My friend is counting on me to keep our streak."
 */

export type FriendshipTier = "acquaintance" | "friend" | "close_friend" | "best_friend" | "soulmate";

export interface FriendshipMilestone {
  tier: FriendshipTier;
  requiredScore: number;
  icon: string;
  label: { ko: string; en: string };
  perk: { ko: string; en: string };
  reward: { coins: number; evolution_points?: number };
}

export interface FriendshipState {
  user_a: string;
  user_b: string;
  score: number;
  tier: FriendshipTier;
  shared_streak: number;
  last_interaction_a: string | null;
  last_interaction_b: string | null;
  milestones_unlocked: string[];
}

export const FRIENDSHIP_MILESTONES: FriendshipMilestone[] = [
  {
    tier: "acquaintance",
    requiredScore: 0,
    icon: "👋",
    label: { ko: "지인", en: "Acquaintance" },
    perk: { ko: "서로의 피드에 표시됩니다", en: "Appear in each other's feed" },
    reward: { coins: 0 },
  },
  {
    tier: "friend",
    requiredScore: 10,
    icon: "🤝",
    label: { ko: "친구", en: "Friend" },
    perk: { ko: "서로의 리액션이 2배 효과", en: "Reactions worth 2x to each other" },
    reward: { coins: 20 },
  },
  {
    tier: "close_friend",
    requiredScore: 30,
    icon: "💛",
    label: { ko: "절친", en: "Close Friend" },
    perk: { ko: "듀오 스트릭 시작 가능", en: "Duo streaks unlocked" },
    reward: { coins: 50, evolution_points: 5 },
  },
  {
    tier: "best_friend",
    requiredScore: 75,
    icon: "💜",
    label: { ko: "베프", en: "Best Friend" },
    perk: { ko: "브리딩 우선권 + 콤보 보상", en: "Breeding priority + combo rewards" },
    reward: { coins: 100, evolution_points: 10 },
  },
  {
    tier: "soulmate",
    requiredScore: 150,
    icon: "✨",
    label: { ko: "소울메이트", en: "Soulmate" },
    perk: { ko: "고유 합체 진화 해금", en: "Unique fusion evolution unlocked" },
    reward: { coins: 300, evolution_points: 25 },
  },
];

// ── Score Changes per Interaction ──

const INTERACTION_SCORES: Record<string, number> = {
  follow: 3,
  react: 1,
  comment: 2,
  gift: 5,
  shared_streak_day: 2,
  breeding: 10,
  daily_chat: 1,
};

export function getInteractionScore(interactionType: string): number {
  return INTERACTION_SCORES[interactionType] ?? 0;
}

export function computeTier(score: number): FriendshipTier {
  for (let i = FRIENDSHIP_MILESTONES.length - 1; i >= 0; i--) {
    if (score >= FRIENDSHIP_MILESTONES[i].requiredScore) {
      return FRIENDSHIP_MILESTONES[i].tier;
    }
  }
  return "acquaintance";
}

export function getMilestone(tier: FriendshipTier): FriendshipMilestone {
  return FRIENDSHIP_MILESTONES.find((m) => m.tier === tier) ?? FRIENDSHIP_MILESTONES[0];
}

export function getNextMilestone(currentTier: FriendshipTier): FriendshipMilestone | null {
  const idx = FRIENDSHIP_MILESTONES.findIndex((m) => m.tier === currentTier);
  if (idx < 0 || idx >= FRIENDSHIP_MILESTONES.length - 1) return null;
  return FRIENDSHIP_MILESTONES[idx + 1];
}

export function computeFriendshipProgress(score: number): {
  currentTier: FriendshipTier;
  nextTier: FriendshipTier | null;
  progress: number;
  scoreToNext: number;
} {
  const tier = computeTier(score);
  const current = getMilestone(tier);
  const next = getNextMilestone(tier);

  if (!next) {
    return { currentTier: tier, nextTier: null, progress: 100, scoreToNext: 0 };
  }

  const range = next.requiredScore - current.requiredScore;
  const within = score - current.requiredScore;

  return {
    currentTier: tier,
    nextTier: next.tier,
    progress: range > 0 ? Math.min(100, Math.round((within / range) * 100)) : 100,
    scoreToNext: Math.max(0, next.requiredScore - score),
  };
}

/**
 * Check if a shared streak is still active.
 * Both users must have interacted within 48 hours.
 */
export function isSharedStreakActive(
  lastInteractionA: string | null,
  lastInteractionB: string | null,
  now = new Date(),
): boolean {
  if (!lastInteractionA || !lastInteractionB) return false;
  const threshold = 48 * 3600 * 1000;
  const timeA = now.getTime() - new Date(lastInteractionA).getTime();
  const timeB = now.getTime() - new Date(lastInteractionB).getTime();
  return timeA < threshold && timeB < threshold;
}

/**
 * Duo streak bonus multiplier applied to both users' rewards.
 */
export function getDuoStreakMultiplier(sharedStreakDays: number): number {
  if (sharedStreakDays >= 30) return 1.5;
  if (sharedStreakDays >= 14) return 1.3;
  if (sharedStreakDays >= 7) return 1.2;
  if (sharedStreakDays >= 3) return 1.1;
  return 1;
}
