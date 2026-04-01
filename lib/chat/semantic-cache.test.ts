import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

import { trySemanticCache } from "./semantic-cache";

function createMockReader(options: {
  rpcData?: Array<{ id: string; content: string; similarity: number; created_at: string; type: string }> | null;
  userChatData?: Array<{ created_at: string }> | null;
  followUpData?: Array<{ content: string }> | null;
}) {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      // Alternate between user chat and followup data based on call count
      if (selectChain._callCount === 0) {
        selectChain._callCount++;
        return Promise.resolve({ data: options.userChatData ?? null });
      }
      return Promise.resolve({ data: options.followUpData ?? null });
    }),
    _callCount: 0,
  };

  return {
    rpc: vi.fn().mockResolvedValue({ data: options.rpcData ?? null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectChain),
    }),
  };
}

describe("trySemanticCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when embedding fails (empty)", async () => {
    const { generateEmbedding } = await import("@/lib/ai/embedding");
    (generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const reader = createMockReader({});
    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).toBeNull();
  });

  it("returns null when no RPC matches", async () => {
    const reader = createMockReader({ rpcData: [] });
    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).toBeNull();
    expect(reader.rpc).toHaveBeenCalledWith("match_memories", expect.objectContaining({
      p_agent_id: "a1",
    }));
  });

  it("returns null when similarity is below threshold", async () => {
    const reader = createMockReader({
      rpcData: [{
        id: "m1",
        content: "hello",
        similarity: 0.5,
        created_at: new Date().toISOString(),
        type: "conversation",
      }],
    });
    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).toBeNull();
  });

  it("returns null when match is too old", async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
    const reader = createMockReader({
      rpcData: [{
        id: "m1",
        content: "hello",
        similarity: 0.95,
        created_at: oldDate,
        type: "conversation",
      }],
    });
    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).toBeNull();
  });

  it("returns cache hit with stream when match found", async () => {
    const now = new Date().toISOString();
    const reader = createMockReader({
      rpcData: [{
        id: "m1",
        content: "hello there",
        similarity: 0.95,
        created_at: now,
        type: "conversation",
      }],
      userChatData: [{ created_at: now }],
      followUpData: [{ content: "Hello! How can I help?" }],
    });

    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello there",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).not.toBeNull();
    expect(result!.cachedResponse).toBe("Hello! How can I help?");
    expect(result!.similarity).toBe(0.95);
    expect(result!.stream).toBeInstanceOf(ReadableStream);
  });

  it("returns null when no user chat row matches", async () => {
    const now = new Date().toISOString();
    const reader = createMockReader({
      rpcData: [{
        id: "m1",
        content: "hello",
        similarity: 0.95,
        created_at: now,
        type: "conversation",
      }],
      userChatData: null,
    });

    const result = await trySemanticCache({
      agentId: "a1",
      message: "hello",
      reader: reader as never,
      systemPrompt: "You are helpful",
      maxTokens: 200,
    });

    expect(result).toBeNull();
  });
});
