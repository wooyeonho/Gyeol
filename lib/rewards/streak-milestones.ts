export type StreakMilestone = {
  days: number;
  reward: "coin" | "appearance" | "title" | "mutation";
  amount?: number;
  id?: string;
  badge: Record<string, string>;
};

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, reward: "coin", amount: 10, badge: { ko: "불씨", en: "Spark" } },
  { days: 5, reward: "coin", amount: 15, badge: { ko: "횃불", en: "Torch" } },
  { days: 7, reward: "coin", amount: 25, badge: { ko: "불꽃", en: "Flame" } },
  { days: 10, reward: "coin", amount: 35, badge: { ko: "화염", en: "Blaze" } },
  { days: 14, reward: "appearance", id: "glow_ring", badge: { ko: "빛의 고리", en: "Glow Ring" } },
  { days: 21, reward: "coin", amount: 60, badge: { ko: "불길", en: "Wildfire" } },
  { days: 30, reward: "coin", amount: 100, badge: { ko: "지옥불", en: "Inferno" } },
  { days: 50, reward: "title", id: "devoted", badge: { ko: "헌신자", en: "Devoted" } },
  { days: 100, reward: "mutation", id: "golden", badge: { ko: "전설", en: "Legend" } },
];

export function getNextMilestone(currentDays: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentDays) ?? null;
}

export function getAchievedMilestones(currentDays: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => m.days <= currentDays);
}
