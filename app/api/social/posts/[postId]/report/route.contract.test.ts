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

describe("/api/social/posts/[postId]/report contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates or updates a report and can move a post to pending", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockResolvedValue({ error: null });

    (createServerSupabase as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-self" });

    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "social_posts") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: "post-1" },
                }),
              }),
            }),
            update: () => ({
              eq: update,
            }),
          };
        }
        if (table === "social_reports") {
          return {
            upsert,
            select: () => ({
              eq: () => ({
                limit: async () => ({
                  data: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/posts/post-1/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "unsafe_or_unwanted", detail: "flag" }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ postId: "post-1" }),
    });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
