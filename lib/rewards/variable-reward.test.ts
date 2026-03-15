import { describe, expect, it, vi } from "vitest";
import {
  applyRewardToInventory,
  createDailyLoginReward,
  createEmptyRewardInventory,
  getRewardProgress,
  getStreakRewardMultiplier,
  rollReward,
} from "./variable-reward";

describe("variable reward engine", () => {
  it("applies streak multipliers at defined thresholds", () => {
    expect(getStreakRewardMultiplier(0)).toBe(1);
    expect(getStreakRewardMultiplier(3)).toBe(1.5);
    expect(getStreakRewardMultiplier(7)).toBe(2);
    expect(getStreakRewardMultiplier(30)).toBe(3);
  });

  it("returns guaranteed countdown progress", () => {
    expect(getRewardProgress(0, 0)).toEqual({
      guaranteedEvery: 6,
      messagesSinceReward: 0,
      messagesUntilGuaranteed: 6,
      streakMultiplier: 1,
    });

    expect(getRewardProgress(6, 7)).toEqual({
      guaranteedEvery: 6,
      messagesSinceReward: 6,
      messagesUntilGuaranteed: 0,
      streakMultiplier: 2,
    });
  });

  it("never returns none when reward is forced", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const reward = rollReward(0, { forceReward: true });
    expect(reward.tier).not.toBe("none");
    randomSpy.mockRestore();
  });

  it("applies reward deltas to inventory", () => {
    const reward = createDailyLoginReward(7);
    const inventory = applyRewardToInventory(createEmptyRewardInventory(), reward);
    expect(inventory.coins).toBeGreaterThanOrEqual(2);
  });
});
