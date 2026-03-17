/**
 * Reward middleware — extracted from chat-store to separate concerns.
 * Handles reward rolling, inventory persistence, haptic/sound feedback.
 */
import { useAgentStore } from "@/store/agent-store";
import {
  applyRewardToInventory,
  createWeeklyEventReward,
  getRewardProgress,
  readRewardInventory,
  rollReward,
  writeRewardInventory,
  writeMessagesSinceReward,
  type RewardInventory,
  type RewardProgress,
  type RewardResult,
} from "@/lib/rewards/variable-reward";
import { haptic, playSound } from "@/lib/micro-interactions";

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
  const reward = rollReward(streakDays, {
    forceReward: guaranteedProgress.messagesUntilGuaranteed === 0,
    source: "message",
  });

  if (reward.tier !== "none") {
    const freshInventory = readRewardInventory();
    const nextInventory = applyRewardToInventory(freshInventory, reward);
    persistRewardState(nextInventory, 0);

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
