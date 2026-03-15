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

describe("/api/social/posts/[postId]/reaction contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts a valid reaction for a public social participant", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
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
                    config: { social_public_enabled: true },
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
          };
        }
        if (table === "social_reactions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
            upsert,
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/posts/post-1/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction_type: "like" }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ postId: "post-1" }),
    });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
