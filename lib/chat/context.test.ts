import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

import { buildChatPromptContext } from "./context";

function createReader() {
  return {
    from(table: string) {
      if (table === "agent_state") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  fragments: ["Remember the user gently."],
                  config: { recall_count: 3, tone: "formal" },
                  self_name: "GYEOL",
                  intimacy_score: 33,
                },
              }),
            }),
          }),
        };
      }
      if (table === "world_state") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { weather: { name: "Aurora Drift" } } }),
            }),
          }),
        };
      }
      if (table === "chats") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    { role: "assistant", content: "Welcome back." },
                    { role: "user", content: "I feel different today." },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      if (table === "autonomous_logs") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [{ summary: "Stayed awake for a while." }],
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async () => ({
      data: [
        {
          id: "mem-1",
          content: "The user often talks about change.",
          reference_count: 2,
        },
      ],
    }),
  };
}

function createWriter() {
  return {
    from(table: string) {
      if (table !== "memories") throw new Error(`unexpected table: ${table}`);
      return {
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  };
}

describe("buildChatPromptContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds system prompt and metrics from db context", async () => {
    const context = await buildChatPromptContext({
      agentId: "agent-1",
      message: "How should you remember me today?",
      reader: createReader() as never,
      writer: createWriter() as never,
    });

    expect(context.promptMetrics.memoryCount).toBe(1);
    expect(context.promptMetrics.autonomousLogCount).toBe(1);
    expect(context.promptMetrics.recentChatCount).toBe(2);
    expect(context.chatMessages.at(-1)?.content).toBe("How should you remember me today?");
    expect(context.systemPrompt).toContain("Aurora Drift");
    expect(context.systemPrompt).toContain("The user often talks about change.");
  });
});
