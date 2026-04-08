/**
 * Reward middleware — extracted from chat-store to separate concerns.
 * Handles reward rolling, inventory persistence, haptic/sound feedback.
 */
import { useAgentStore } from "@/store/agent-store";
import {
  applyRewardToInventory,
  clearComebackMultiplier,
  createWeeklyEventReward,
  getPlanRewardMultiplier,
  getRewardProgress,
  readComebackMultiplier,
  readRewardInventory,
  rollReward,
  writeLastRewardAt,
  writeRewardInventory,
  writeMessagesSinceReward,
  type RewardInventory,
  type RewardProgress,
  type RewardResult,
} from "@/lib/rewards/variable-reward";
import { haptic, playSound } from "@/lib/micro-interactions";

const FIRST_MSG_KEY = "gyeol_first_daily_message_v1";

function isFirstDailyMessage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const today = new Date().toISOString().slice(0, 10);
    return window.localStorage.getItem(FIRST_MSG_KEY) !== today;
  } catch {
    return false;
  }
}

function markFirstDailyMessage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_MSG_KEY, new Date().toISOString().slice(0, 10));
  } catch { /* ignore */ }
}

function persistRewardState(inventory: RewardInventory, messagesSinceReward: number) {
  writeRewardInventory(inventory);
  writeMessagesSinceReward(messagesSinceReward);
}

export interface RewardUpdate {
  lastReward: RewardResult | null;
  rewardInventory: RewardInventory;
  rewardProgress?: RewardProgress;
}

/**
 * Roll a variable reward after a successful assistant message.
 * Returns partial state to merge into the chat store.
 */
export function processMessageReward(
  currentProgress: RewardProgress,
): RewardUpdate {
  const agentState = useAgentStore.getState().agentState;
  const streakDays = typeof agentState?.streak_days === "number" ? agentState.streak_days : 0;
  const nextMessagesSinceReward = currentProgress.messagesSinceReward + 1;
  const guaranteedProgress = getRewardProgress(nextMessagesSinceReward, streakDays);

  // Read (but don't clear yet) comeback multiplier — only clear if a reward is granted
  const comebackMul = readComebackMultiplier();

  // Apply plan-tier multiplier (Pro=1.5x, Premium=2x)
  const planTier = useAgentStore.getState().planTier;
  const planMul = getPlanRewardMultiplier(planTier);

  // Effective comeback multiplier combines plan bonus
  const effectiveComebackMul = Math.max(comebackMul, planMul);

  // First message of the day always gets a guaranteed reward
  const firstDaily = isFirstDailyMessage();
  if (firstDaily) markFirstDailyMessage();

  const reward = rollReward(streakDays, {
    forceReward: firstDaily || guaranteedProgress.messagesUntilGuaranteed === 0,
    source: "message",
    comebackMultiplier: effectiveComebackMul,
  });

  if (reward.tier !== "none") {
    const freshInventory = readRewardInventory();
    const nextInventory = applyRewardToInventory(freshInventory, reward);
    persistRewardState(nextInventory, 0);
    // Consume comeback multiplier now that a reward was actually granted
    clearComebackMultiplier();
    // Record reward timestamp for expiry countdown
    writeLastRewardAt();
    // Fire-and-forget: persist to server for server-side expiry checks
    fetch("/api/reward/track", { method: "POST" }).catch(() => {});

    if (reward.tier === "jackpot") {
      haptic("jackpot");
      playSound("jackpot");
    } else if (reward.tier === "large") {
      haptic("success");
      playSound("streak");
    } else {
      haptic("receive");
      playSound("receive");
    }

    return {
      lastReward: reward,
      rewardInventory: nextInventory,
      rewardProgress: getRewardProgress(0, streakDays),
    };
  }

  const freshInvForPersist = readRewardInventory();
  persistRewardState(freshInvForPersist, nextMessagesSinceReward);
  haptic("receive");
  playSound("receive");

  return {
    lastReward: null,
    rewardInventory: freshInvForPersist,
    rewardProgress: guaranteedProgress,
  };
}

/**
 * Process weekly event completion reward.
 */
export function processWeeklyEventReward(): RewardUpdate {
  const agentState = useAgentStore.getState().agentState;
  const streakDays = typeof agentState?.streak_days === "number" ? agentState.streak_days : 0;
  const weeklyReward = createWeeklyEventReward(streakDays);
  const freshWeeklyInv = readRewardInventory();
  const nextInventory = applyRewardToInventory(freshWeeklyInv, weeklyReward);
  writeRewardInventory(nextInventory);

  haptic("jackpot");
  playSound("jackpot");

  return {
    lastReward: weeklyReward,
    rewardInventory: nextInventory,
  };
}
