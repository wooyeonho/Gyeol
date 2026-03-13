import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

vi.mock("@/lib/goals/detector", () => ({
  detectGoalSignal: vi.fn().mockReturnValue({ activeGoal: null, researchFocus: null }),
}));

vi.mock("@/lib/identity/usage-profile", () => ({
  updateUsageProfile: vi.fn().mockReturnValue({
    primary_mode: "reflective",
    scores: { reflective: 1 },
    updated_at: "2026-03-13T00:00:00.000Z",
  }),
}));

vi.mock("@/lib/analytics/events", () => ({
  PRODUCT_EVENT: {
    chatPostProcessCompleted: "chat_post_process_completed",
  },
  recordServerEvent: vi.fn(),
}));

vi.mock("@/lib/evolution/gen-level", () => ({
  checkEvolution: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/personality/deception", () => ({
  processHiddenEmotions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/personality/voice", () => ({
  updateVoiceParams: vi.fn().mockResolvedValue(undefined),
}));

import { persistChatTurn } from "./post-process";

function createWriter() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  return {
    from(table: string) {
      if (table === "chats" || table === "memories" || table === "autonomous_logs") {
        return { insert };
      }
      if (table === "agent_state") {
        return { update };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    insert,
    update,
    updateEq,
  };
}

describe("persistChatTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores chats, memory, and updates agent state", async () => {
    const writer = createWriter();
    const result = await persistChatTurn({
      agentId: "agent-1",
      agentState: {
        total_messages: 4,
        intimacy_score: 2,
        vitality: 0.7,
        config: {},
      },
      durationMs: 1200,
      message: "Today I want to grow.",
      reply: "Then let us leave a trace of that change.",
      writer: writer as never,
    });

    expect(result.totalMessages).toBe(5);
    expect(result.newVitality).toBeCloseTo(0.72);
    expect(writer.insert).toHaveBeenCalled();
    expect(writer.update).toHaveBeenCalled();
    expect(writer.updateEq).toHaveBeenCalled();
  });
});
