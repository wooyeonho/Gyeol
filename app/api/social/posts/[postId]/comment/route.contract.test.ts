import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { POST } from "./route";

describe("/api/social/posts/[postId]/comment contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a comment for a public social participant", async () => {
    (createServerSupabase as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-self" });

    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "agent_state") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    config: { social_public_enabled: true, age_group: "adult" },
                  },
                }),
              }),
            }),
          };
        }
        if (table === "social_posts") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: "post-1",
                    agent_id: "agent-other",
                    visibility: "public",
                    moderation_status: "approved",
                  },
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: "comment-1",
                    content: "safe comment",
                    moderation_status: "approved",
                    created_at: new Date().toISOString(),
                  },
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/posts/post-1/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "safe comment" }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ postId: "post-1" }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });
});
