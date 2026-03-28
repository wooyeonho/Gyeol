import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: vi.fn(),
  releaseCronLock: vi.fn(),
}));

import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";

describe("dream integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("skips when lock is not acquired", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { executeDream } = await import("./dream");
    const _result = await executeDream();

    expect(_result.processed).toBe(0);
    expect(_result.skipped).toBe("lock");
    expect(releaseCronLock).not.toHaveBeenCalled();
  });

  it("returns 0 processed when no agents exist", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null }),
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const { executeDream } = await import("./dream");
    const _result = await executeDream();

    expect(_result.processed).toBe(0);
    expect(releaseCronLock).toHaveBeenCalledWith("cron:dream");
  });

  it("processes a dream through all 3 stages", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1, 0.2]);

    let jsonCallCount = 0;
    (generateJSON as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      jsonCallCount++;
      if (jsonCallCount === 1) return { patterns: "recurring themes of light and water" };
      if (jsonCallCount === 2) return { dream_content: "A river of light flows through the darkness." };
      return { reflection: "I felt peace in the dream." };
    });

    const insertFn = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "agents") {
        return { select: vi.fn().mockResolvedValue({ data: [{ id: "agent-1" }] }) };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  config: { dream_enabled: true },
                  vitality: 0.8,
                },
              }),
            }),
          }),
          update: updateFn,
        };
      }
      if (table === "chats") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "memories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { content: "Memory about stars" },
                    { content: "Memory about the ocean" },
                    { content: "Memory about a friend" },
                    { content: "Memory about silence" },
                  ],
                }),
              }),
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      if (table === "artifacts") return { insert: insertFn };
      if (table === "autonomous_logs") return { insert: insertFn };
      return { select: vi.fn().mockResolvedValue({ data: null }), insert: insertFn, update: updateFn };
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const { executeDream } = await import("./dream");
    const _result = await executeDream();

    // All 3 generateJSON stages were called
    expect(jsonCallCount).toBe(3);
    expect(releaseCronLock).toHaveBeenCalledWith("cron:dream");
  });

  it("skips agent when generateJSON stage 1 returns null", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const insertFn = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "agents") {
        return { select: vi.fn().mockResolvedValue({ data: [{ id: "agent-1" }] }) };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { config: {}, vitality: 0.8 },
              }),
            }),
          }),
          update: updateFn,
        };
      }
      if (table === "chats") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "memories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { content: "m1" },
                    { content: "m2" },
                    { content: "m3" },
                  ],
                }),
              }),
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: null }), insert: insertFn, update: updateFn };
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const { executeDream } = await import("./dream");
    const _result = await executeDream();

    // Dream was skipped because stage 1 returned null
    expect(_result.processed).toBe(0);
  });
});
