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

describe("/api/social/posts contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a public social post", async () => {
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
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: "post-1",
                    content: "hello world",
                    topic: "intro",
                    language: "en",
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

    const request = new Request("http://localhost/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hello world", topic: "intro", language: "en" }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.post as Record<string, unknown>).moderation_status).toBe("approved");
  });
});
