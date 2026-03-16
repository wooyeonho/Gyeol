import { describe, expect, it } from "vitest";
import {
  createEmptyWeeklyEventState,
  formatWeeklyEventCountdown,
  getWeeklyEventProgress,
  normalizeWeeklyEventState,
  registerWeeklyEventMessage,
} from "./weekly-event";

describe("weekly event helpers", () => {
  it("resets stale state when week changes", () => {
    const state = normalizeWeeklyEventState(
      { weekKey: "1999-W01", messageCount: 8, completed: true, claimedAt: "1999-01-01T00:00:00.000Z" },
      new Date("2026-03-15T00:00:00.000Z"),
    );

    expect(state.messageCount).toBe(0);
    expect(state.completed).toBe(false);
  });

  it("marks completion when target is reached", () => {
    const now = new Date("2026-03-15T00:00:00.000Z");
    let state = createEmptyWeeklyEventState(now);
    let completedNow = false;

    for (let i = 0; i < 10; i += 1) {
      const result = registerWeeklyEventMessage(state, now);
      state = result.state;
      completedNow = result.completedNow;
    }

    expect(state.completed).toBe(true);
    expect(completedNow).toBe(true);
    expect(getWeeklyEventProgress(state, now).remaining).toBe(0);
  });

  it("formats countdown labels", () => {
    const label = formatWeeklyEventCountdown(
      "ko",
      "2026-03-15T23:59:59.999Z",
      new Date("2026-03-15T20:00:00.000Z"),
    );

    expect(label).toContain("남음");
  });
});
