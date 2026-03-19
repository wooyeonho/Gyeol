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

describe("/api/collective contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("returns collective stats", async () => {
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          limit: async () => ({
            data: [
              { mood: "calm", vitality: 0.8, gen_level: 2 },
              { mood: "calm", vitality: 0.6, gen_level: 3 },
              { mood: "joy", vitality: 0.9, gen_level: 1 },
            ],
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { collective: Record<string, unknown> };
    expect(body.collective).toHaveProperty("total_agents");
    expect(body.collective).toHaveProperty("mood_distribution");
    expect(body.collective).toHaveProperty("avg_vitality");
    expect(body.collective).toHaveProperty("avg_gen_level");
    expect(body.collective.total_agents).toBe(3);
  });

  it("returns 401 when not authenticated", async () => {
    (createServerSupabase as Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
