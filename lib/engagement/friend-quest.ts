/**
 * Friend Quest system — cooperative challenges between two users.
 *
 * Leverages friendship.ts tiers: higher-tier friends get better quest rewards.
 * Quests require both participants to complete actions (e.g., "chat 3 times together").
 */

import type { FriendshipTier } from "./friendship";

export interface FriendQuest {
  id: string;
  type: "chat" | "care" | "gift" | "explore" | "challenge";
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  target: number;
  rewardCoins: number;
  rewardXp: number;
  requiredTier: FriendshipTier;
  expiresInHours: number;
}

export interface FriendQuestState {
  questId: string;
  userA: string;
  userB: string;
  progressA: number;
  progressB: number;
  target: number;
  completed: boolean;
  createdAt: string;
  expiresAt: string;
}

const QUEST_TEMPLATES: Omit<FriendQuest, "id">[] = [
  {
    type: "chat",
    title: { ko: "함께 대화하기", en: "Chat Together" },
    description: { ko: "친구와 각각 3회 채팅하세요", en: "Each chat 3 times" },
    target: 3,
    rewardCoins: 20,
    rewardXp: 30,
    requiredTier: "acquaintance",
    expiresInHours: 24,
  },
  {
    type: "care",
    title: { ko: "돌봄 듀오", en: "Care Duo" },
    description: { ko: "두 사람 모두 크리처를 돌보세요", en: "Both care for creatures" },
    target: 2,
    rewardCoins: 15,
    rewardXp: 20,
    requiredTier: "friend",
    expiresInHours: 48,
  },
  {
    type: "gift",
    title: { ko: "선물 교환", en: "Gift Exchange" },
    description: { ko: "서로 선물을 주고받으세요", en: "Exchange gifts" },
    target: 1,
    rewardCoins: 30,
    rewardXp: 40,
    requiredTier: "close_friend",
    expiresInHours: 72,
  },
  {
    type: "explore",
    title: { ko: "탐험 파티", en: "Explore Party" },
    description: { ko: "함께 새로운 영역을 발견하세요", en: "Discover new areas together" },
    target: 5,
    rewardCoins: 50,
    rewardXp: 60,
    requiredTier: "best_friend",
    expiresInHours: 96,
  },
  {
    type: "challenge",
    title: { ko: "최강 듀오", en: "Ultimate Duo" },
    description: { ko: "함께 10개 챌린지를 완료하세요", en: "Complete 10 challenges together" },
    target: 10,
    rewardCoins: 100,
    rewardXp: 120,
    requiredTier: "soulmate",
    expiresInHours: 168,
  },
];

const TIER_ORDER: FriendshipTier[] = ["acquaintance", "friend", "close_friend", "best_friend", "soulmate"];

function tierIndex(tier: FriendshipTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Get available quests for a friendship tier */
export function getAvailableQuests(friendshipTier: FriendshipTier): FriendQuest[] {
  const idx = tierIndex(friendshipTier);
  return QUEST_TEMPLATES
    .filter((q) => tierIndex(q.requiredTier) <= idx)
    .map((q, i) => ({ ...q, id: `fq-${q.type}-${i}` }));
}

/** Apply tier bonus multiplier to rewards */
export function applyTierBonus(quest: FriendQuest, tier: FriendshipTier): { coins: number; xp: number } {
  const multiplier = 1 + tierIndex(tier) * 0.15;
  return {
    coins: Math.round(quest.rewardCoins * multiplier),
    xp: Math.round(quest.rewardXp * multiplier),
  };
}

/** Check if both participants have met the target */
export function isQuestComplete(state: FriendQuestState): boolean {
  return state.progressA >= state.target && state.progressB >= state.target;
}

/** Check if quest has expired */
export function isQuestExpired(state: FriendQuestState): boolean {
  return new Date(state.expiresAt).getTime() < Date.now();
}
