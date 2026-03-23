import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all heavy dependencies before importing the store
vi.mock("@/store/agent-store", () => ({
  useAgentStore: { getState: () => ({ fetchAgentState: vi.fn() }) },
}));
vi.mock("@/lib/analytics/client", () => ({ trackClientEvent: vi.fn() }));
vi.mock("@/lib/identity/usage-profile", () => ({
  detectPrimaryUsageModeFromText: vi.fn(() => null),
}));
vi.mock("@/lib/micro-interactions", () => ({
  haptic: vi.fn(),
  playSound: vi.fn(),
}));
vi.mock("@/lib/rewards/variable-reward", () => ({
  readRewardInventory: () => ({ coins: 0, items: [] }),
  getRewardProgress: () => ({ messagesSinceReward: 0, streakDays: 0 }),
  readMessagesSinceReward: () => 0,
  writeRewardInventory: vi.fn(),
  applyRewardToInventory: (inv: unknown) => inv,
  createDailyLoginReward: () => ({ type: "daily_login", coins: 5 }),
  hasClaimedDailyLoginBonus: () => false,
  markDailyLoginBonusClaimed: vi.fn(),
}));
vi.mock("@/lib/engagement/weekly-event", () => ({
  readWeeklyEventState: () => ({ week: "", messages: 0, completed: false }),
  getWeeklyEventProgress: () => ({ current: 0, target: 10, completed: false }),
  registerWeeklyEventMessage: (s: unknown) => ({ state: s, completedNow: false }),
  writeWeeklyEventState: vi.fn(),
}));
vi.mock("@/lib/rewards/reward-middleware", () => ({
  processMessageReward: () => ({ lastReward: null, rewardInventory: { coins: 0, items: [] } }),
  processWeeklyEventReward: () => ({ lastReward: null, rewardInventory: { coins: 0, items: [] } }),
}));

import { useChatStore } from "./chat-store";

describe("useChatStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      abortController: null,
      historyLoaded: false,
      pendingUsageMode: null,
      lastLocale: undefined,
      lastReward: null,
    });
  });

  it("initializes with empty messages", () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.historyLoaded).toBe(false);
  });

  it("hydrateRecentMessages sets messages when empty", () => {
    const msgs = [{ role: "assistant" as const, content: "Hello" }];
    useChatStore.getState().hydrateRecentMessages(msgs);
    expect(useChatStore.getState().messages).toEqual(msgs);
    expect(useChatStore.getState().historyLoaded).toBe(true);
  });

  it("hydrateRecentMessages does not overwrite existing messages", () => {
    useChatStore.setState({ messages: [{ role: "user", content: "Hi" }] });
    useChatStore.getState().hydrateRecentMessages([{ role: "assistant", content: "Hello" }]);
    expect(useChatStore.getState().messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("injectGreeting prepends when no assistant greeting exists", () => {
    const greeting = { role: "assistant" as const, content: "Welcome!" };
    useChatStore.getState().injectGreeting(greeting);
    expect(useChatStore.getState().messages[0]).toEqual(greeting);
  });

  it("injectGreeting does not duplicate if assistant message already first", () => {
    useChatStore.setState({ messages: [{ role: "assistant", content: "Hi" }] });
    useChatStore.getState().injectGreeting({ role: "assistant", content: "Welcome!" });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe("Hi");
  });

  it("clearReward sets lastReward to null", () => {
    useChatStore.setState({ lastReward: { type: "daily_login", coins: 5 } as never });
    useChatStore.getState().clearReward();
    expect(useChatStore.getState().lastReward).toBeNull();
  });

  it("stopStreaming aborts and clears streaming state", () => {
    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, "abort");
    useChatStore.setState({
      isStreaming: true,
      abortController: controller,
      messages: [{ role: "assistant", content: "" }],
    });
    useChatStore.getState().stopStreaming();
    expect(abortSpy).toHaveBeenCalled();
    expect(useChatStore.getState().isStreaming).toBe(false);
    expect(useChatStore.getState().abortController).toBeNull();
  });

  it("sendMessage does nothing when already streaming", async () => {
    useChatStore.setState({ isStreaming: true });
    await useChatStore.getState().sendMessage("hello");
    // Should not add messages since already streaming
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("retryLastMessage does nothing when less than 2 messages", async () => {
    useChatStore.setState({ messages: [{ role: "user", content: "hi" }] });
    await useChatStore.getState().retryLastMessage();
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it("retryLastMessage does nothing when last message is not an error", async () => {
    useChatStore.setState({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello", error: false },
      ],
    });
    await useChatStore.getState().retryLastMessage();
    // No change since last message is not an error
    expect(useChatStore.getState().messages[1].content).toBe("hello");
  });
});
