import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { GET } from "./route";

describe("/api/home/summary contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recap and summary payload for an authed user", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-1" });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "agent_state") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { total_messages: 12, gen_level: 2, mood: "calm", vitality: 0.8 },
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
                    data: [
                      { id: "l1", summary: "진화 로그", action_type: "evolution", created_at: new Date().toISOString() },
                    ],
                  }),
                }),
                in: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        { id: "m1", summary: "첫 꿈을 꿨어요", action_type: "dream", created_at: new Date().toISOString() },
                      ],
                    }),
                  }),
                }),
                gte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        { created_at: new Date().toISOString(), action_type: "evolution" },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "artifacts") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      { id: "a1", title: "새 아티팩트", content: "내용", created_at: new Date().toISOString() },
                    ],
                  }),
                }),
                gte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        { created_at: new Date().toISOString(), type: "image" },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "chats") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: { created_at: new Date().toISOString() },
                    }),
                  }),
                }),
                gte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        { created_at: new Date().toISOString(), role: "user" },
                        { created_at: new Date().toISOString(), role: "assistant" },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "user_subscriptions") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "sub-1",
                        plan_tier: "pro",
                        status: "active",
                        provider: "mock",
                        current_period_end: new Date().toISOString(),
                        cancel_at_period_end: false,
                        created_at: new Date().toISOString(),
                      },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "research_tasks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [{ id: "rt1", title: "최신 연구 과제", priority: 2, created_at: new Date().toISOString() }],
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Array.isArray(body.recent_items)).toBe(true);

    const summary = body.summary as Record<string, unknown>;
    expect(typeof summary.total_messages).toBe("number");
    expect(typeof summary.gen_level).toBe("number");

    const recap = body.recap as Record<string, unknown>;
    expect(typeof recap.next_action).toBe("string");
    expect(typeof (recap.streak as Record<string, unknown>).days).toBe("number");
    expect(typeof (recap.today as Record<string, unknown>).user_messages).toBe("number");
    expect(typeof (recap.weekly as Record<string, unknown>).highlight).toBe("string");
  });
});
