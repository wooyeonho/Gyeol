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

describe("/api/social contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns social feed, logs, and related agent data", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-self" });

    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "social_logs") {
          return {
            select: () => ({
              or: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: "log-1",
                        agent_a_id: "agent-self",
                        agent_b_id: "agent-other",
                        topic: "shared glow",
                        conversation: "hello",
                        outcome: "warm ending",
                        created_at: new Date().toISOString(),
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "breeding_records") {
          return {
            select: () => ({
              or: () => ({
                order: () => ({
                  limit: async () => ({ data: [] }),
                }),
              }),
            }),
          };
        }

        if (table === "agents") {
          return {
            select: () => ({
              neq: () => ({
                limit: async () => ({ data: [{ id: "agent-other" }] }),
              }),
            }),
          };
        }

        if (table === "autonomous_logs") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [{ id: "gift-1", summary: "Sent 5 coins", created_at: new Date().toISOString() }],
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "social_connections") {
          return {
            select: () => ({
              eq: (_field: string, value: string) => {
                if (value === "agent-self") {
                  return Promise.resolve({ data: [{ follower_agent_id: "agent-self", followee_agent_id: "agent-other" }] });
                }
                return Promise.resolve({ data: [{ follower_agent_id: "agent-other", followee_agent_id: "agent-self" }] });
              },
            }),
          };
        }

        if (table === "agent_state") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    self_name: "Self",
                    visual: { color: "#00ffff" },
                    genome: { species: "echo" },
                    config: { usage_profile: { primary_mode: "social" } },
                    self_model: { current_role: "listener" },
                    gen_level: 3,
                    vitality: 0.88,
                    mood: "curious",
                  },
                }),
              }),
              in: async () => ({
                data: [
                  {
                    agent_id: "agent-self",
                    self_name: "Self",
                    gen_level: 3,
                    vitality: 0.88,
                    mood: "curious",
                    visual: { color: "#00ffff" },
                    genome: { species: "echo" },
                    config: { usage_profile: { primary_mode: "social" } },
                    self_model: { current_role: "listener" },
                  },
                  {
                    agent_id: "agent-other",
                    self_name: "Other",
                    gen_level: 2,
                    vitality: 0.76,
                    mood: "calm",
                    visual: { color: "#ff99cc" },
                    genome: { species: "bloom" },
                    config: { usage_profile: { primary_mode: "social" } },
                    self_model: { current_role: "speaker" },
                  },
                ],
              }),
            }),
          };
        }

        if (table === "social_posts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: "post-1",
                            agent_id: "agent-other",
                            kind: "post",
                            parent_post_id: null,
                            content: "A public autonomous post",
                            topic: "echo",
                            language: "en",
                            metadata: {},
                            created_at: new Date().toISOString(),
                          },
                        ],
                      }),
                    }),
                  }),
                }),
              }),
              in: (field: string) => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      order: () => ({
                        limit: async () => ({
                          data: field === "parent_post_id"
                            ? [
                                {
                                  id: "comment-1",
                                  agent_id: "agent-self",
                                  kind: "comment",
                                  parent_post_id: "post-1",
                                  content: "Small comment",
                                  topic: null,
                                  language: "en",
                                  metadata: {},
                                  created_at: new Date().toISOString(),
                                },
                              ]
                            : [],
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "social_reactions") {
          return {
            select: () => ({
              in: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: "reaction-1",
                      post_id: "post-1",
                      agent_id: "agent-self",
                      reaction_type: "like",
                      created_at: new Date().toISOString(),
                    },
                  ],
                }),
              }),
            }),
          };
        }

        if (table === "memories") {
          return {
            select: () => ({
              in: async () => ({
                data: [{ agent_id: "agent-other" }, { agent_id: "agent-other" }],
              }),
            }),
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(Array.isArray(body.socialLogs)).toBe(true);
    expect(Array.isArray(body.socialPosts)).toBe(true);
    expect(Array.isArray(body.otherAgents)).toBe(true);
    expect(Array.isArray(body.giftExchanges)).toBe(true);

    const firstPost = (body.socialPosts as Array<Record<string, unknown>>)[0];
    expect(typeof firstPost.content).toBe("string");
    expect(typeof firstPost.reactionCount).toBe("number");
    expect(Array.isArray(firstPost.comments)).toBe(true);
  });
});
