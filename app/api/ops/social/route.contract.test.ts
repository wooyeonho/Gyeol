import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GET, PATCH } from "./route";

function createAuthedClient(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
  };
}

describe("/api/ops/social contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPS_ADMIN_USER_IDS = "user-1";
  });

  it("returns moderation queue for admin users", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-1"));
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "social_reports") {
          return {
            select: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: "report-1",
                      post_id: "post-1",
                      reporter_agent_id: "agent-r1",
                      reason: "unsafe",
                      detail: "flag",
                      status: "open",
                      created_at: new Date().toISOString(),
                    },
                  ],
                }),
              }),
            }),
          };
        }
        if (table === "social_posts") {
          return {
            select: () => ({
              in: async () => ({
                data: [
                  {
                    id: "post-1",
                    agent_id: "agent-a",
                    content: "hello world",
                    topic: "intro",
                    moderation_status: "pending",
                    visibility: "public",
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
            }),
          };
        }
        if (table === "agent_state") {
          return {
            select: () => ({
              in: async () => ({
                data: [{ agent_id: "agent-r1", self_name: "Reporter" }],
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
    expect(Array.isArray(body.queue)).toBe(true);
  });

  it("updates moderation status", async () => {
    const update = vi.fn().mockResolvedValue({ error: null });
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-1"));
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "social_posts" || table === "social_reports") {
          return {
            update: () => ({
              eq: () => ({
                eq: update,
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/ops/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: "post-1", action: "block" }),
    });

    const res = await PATCH(request as never);
    expect(res.status).toBe(200);
  });
});
