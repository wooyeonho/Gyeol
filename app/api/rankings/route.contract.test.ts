import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function mockAuth() {
  (createServerSupabase as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  });
}

describe("/api/rankings contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("returns sorted rankings array", async () => {
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          limit: async () => ({
            data: [
              { agent_id: "a1", self_name: "Alpha", gen_level: 5, vitality: 0.9, coins: 100, total_messages: 200 },
              { agent_id: "a2", self_name: "Beta", gen_level: 2, vitality: 0.5, coins: 50, total_messages: 100 },
            ],
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rankings: Array<{ agent_id: string; score: number }> };
    expect(Array.isArray(body.rankings)).toBe(true);
    expect(body.rankings[0].score).toBeGreaterThanOrEqual(body.rankings[1].score);
    expect(body.rankings[0]).toHaveProperty("self_name");
    expect(body.rankings[0]).toHaveProperty("gen_level");
  });

  it("returns 401 when unauthorized", async () => {
    (createServerSupabase as Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
