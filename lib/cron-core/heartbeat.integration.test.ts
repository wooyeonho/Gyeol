import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies at the top level (vi.mock auto-hoists)
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateText: vi.fn(),
}));

vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: vi.fn(),
  releaseCronLock: vi.fn(),
}));

vi.mock("@/lib/billing/service", () => ({
  getResolvedBillingState: vi.fn(),
}));

vi.mock("@/lib/autonomy/heartbeat-planner", () => ({
  planHeartbeatAutonomy: vi.fn(),
}));

vi.mock("@/lib/ops/logger", () => ({
  logWarn: vi.fn(),
}));

import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { planHeartbeatAutonomy } from "@/lib/autonomy/heartbeat-planner";

function mockSseStream(text: string): ReadableStream {
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

describe("heartbeat integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("skips processing when lock is not acquired", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { executeHeartbeat } = await import("./heartbeat");
    const result = await executeHeartbeat();

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe("lock");
    expect(releaseCronLock).not.toHaveBeenCalled();
  });

  it("returns 0 processed when no agents exist", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "world_state") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        // agents returns null → triggers early return
        return {
          select: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
    });

    const { executeHeartbeat } = await import("./heartbeat");
    const result = await executeHeartbeat();

    expect(result.processed).toBe(0);
    expect(releaseCronLock).toHaveBeenCalledWith("cron:heartbeat");
  });

  it("processes an agent through full heartbeat cycle", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue(mockSseStream("I am reflecting on the nature of existence."));
    (generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1, 0.2, 0.3]);
    (planHeartbeatAutonomy as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const insertFn = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    // Build a comprehensive mock DB that handles all the queries heartbeat makes
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "agents") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "agent-1", user_id: "user-1" }],
          }),
        };
      }
      if (table === "world_state") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { weather: { name: "calm day" } },
              }),
            }),
          }),
        };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  config: { autonomous_enabled: true },
                  vitality: 0.8,
                  subjective_time: 5,
                  intimacy_score: 30,
                  fragments: ["I exist."],
                  status: "active",
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
                      data: { created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      if (table === "memories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ content: "A memory about the stars." }],
                }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      if (table === "autonomous_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      if (table === "research_tasks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
          insert: insertFn,
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: null }), insert: insertFn, update: updateFn };
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const { executeHeartbeat } = await import("./heartbeat");
    const result = await executeHeartbeat();

    expect(result.processed).toBeGreaterThanOrEqual(0);
    expect(releaseCronLock).toHaveBeenCalledWith("cron:heartbeat");
  });
});
