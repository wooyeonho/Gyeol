/**
 * Variable reward engine — surprise bonuses that keep users coming back.
 *
 * Uses a slot-machine-style probability system:
 * every qualifying action (daily login, milestone, streak) rolls against
 * a set of weighted reward tiers.  The result is displayed via the
 * `<RewardToast />` component.
 */

export type RewardTier = "none" | "small" | "medium" | "large" | "jackpot";

export type RewardResult = {
  tier: RewardTier;
  label: Record<string, string>;
  coins: number;
  /** Visual emoji shown in toast */
  icon: string;
};

type RewardTableEntry = { tier: RewardTier; weight: number; coins: number; icon: string; label: Record<string, string> };

const REWARD_TABLE: RewardTableEntry[] = [
  { tier: "none", weight: 5, coins: 0, icon: "", label: { ko: "", en: "" } },
  { tier: "small", weight: 50, coins: 5, icon: "✨", label: { ko: "작은 보상", en: "Small reward" } },
  { tier: "medium", weight: 28, coins: 15, icon: "🎁", label: { ko: "보상 상자", en: "Reward box" } },
  { tier: "large", weight: 12, coins: 40, icon: "💎", label: { ko: "희귀 보상", en: "Rare reward" } },
  { tier: "jackpot", weight: 5, coins: 100, icon: "🏆", label: { ko: "잭팟!", en: "Jackpot!" } },
];

const TOTAL_WEIGHT = REWARD_TABLE.reduce((sum, e) => sum + e.weight, 0);

/**
 * Roll a random reward.
 *
 * @param streakDays  current streak length — higher streaks bias toward better rewards
 * @returns The reward result (tier may be "none" meaning no popup shown)
 */
export function rollReward(streakDays = 0): RewardResult {
  // Streak bonus: each streak day adds a small weight shift toward better tiers
  const streakBonus = Math.min(streakDays * 0.5, 15); // max +15% shift
  const adjustedTotal = TOTAL_WEIGHT - streakBonus;

  let roll = Math.random() * adjustedTotal;
  // The streak bonus effectively reduces the "none" bucket
  for (const entry of REWARD_TABLE) {
    const w = entry.tier === "none" ? Math.max(0, entry.weight - streakBonus) : entry.weight;
    roll -= w;
    if (roll <= 0) {
      return { tier: entry.tier, label: entry.label, coins: entry.coins, icon: entry.icon };
    }
  }
  // Fallback — should not reach here
  return { tier: "none", label: { ko: "", en: "" }, coins: 0, icon: "" };
}

/**
 * Determine whether a "mystery box" event should trigger.
 * Mystery boxes appear roughly once per 10 sessions with diminishing frequency.
 *
 * @param sessionCount  total lifetime session count for this user
 */
export function shouldShowMysteryBox(sessionCount: number): boolean {
  if (sessionCount < 3) return false; // never on first few sessions
  // ~10 % base chance, decaying slightly as sessions grow
  const chance = 0.10 * Math.max(0.3, 1 - sessionCount / 200);
  return Math.random() < chance;
}
