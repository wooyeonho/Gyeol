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
import { POST, DELETE } from "./route";

describe("/api/social/follow contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("follows a target agent", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    (createServerSupabase as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-self" });
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("social_connections");
        return { upsert };
      },
    });

    const request = new Request("http://localhost/api/social/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_agent_id: "agent-other" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("unfollows a target agent", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    (createServerSupabase as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-self" });
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq,
          }),
        }),
      }),
    });

    const request = new Request("http://localhost/api/social/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_agent_id: "agent-other" }),
    });
    const response = await DELETE(request as never);
    expect(response.status).toBe(200);
  });
});
