import { describe, it, expect } from "vitest";
import { XP_REWARDS } from "./streak-xp";

describe("XP_REWARDS", () => {
  it("defines a non-negative reward for every known reason", () => {
    for (const [reason, amount] of Object.entries(XP_REWARDS)) {
      expect(amount, `XP reward for ${reason}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("rewards chat messages more than passive visits", () => {
    expect(XP_REWARDS["chat:message"]).toBeGreaterThan(XP_REWARDS["discover:visit"]);
  });

  it("quest completion is the highest single-action reward", () => {
    const max = Math.max(...Object.values(XP_REWARDS));
    expect(XP_REWARDS["quest:complete"]).toBe(max);
  });
});
