import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function mockExploreService() {
  return {
    from(table: string) {
      if (table === "agents") {
        return {
          select: () => ({
            limit: async () => ({
              data: [{ id: "a1", created_at: "2025-01-01T00:00:00Z" }],
            }),
          }),
        };
      }
      if (table === "agent_state") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  agent_id: "a1",
                  self_name: "Luma",
                  gen_level: 3,
                  vitality: 0.8,
                  total_messages: 50,
                  visual: { color: "#a0f" },
                  genome: { species: "lumen" },
                  config: {},
                },
              ],
            }),
          }),
        };
      }
      if (table === "memories") {
        return {
          select: () => ({
            in: async () => ({ data: [{ agent_id: "a1" }, { agent_id: "a1" }] }),
          }),
        };
      }
      return { select: async () => ({ data: [] }) };
    },
  };
}

describe("/api/explore contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceClient as Mock).mockReturnValue(mockExploreService());
  });

  it("returns profiles array with expected fields", async () => {
    const req = new Request("http://localhost/api/explore");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { profiles: Array<Record<string, unknown>> };
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles.length).toBeGreaterThan(0);
    const p = body.profiles[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("self_name");
    expect(p).toHaveProperty("gen_level");
    expect(p).toHaveProperty("vitality");
    expect(p).toHaveProperty("memory_count");
    expect(p).toHaveProperty("species");
  });

  it("returns empty profiles when no agents", async () => {
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          limit: async () => ({ data: [] }),
        }),
      }),
    });
    const req = new Request("http://localhost/api/explore");
    const res = await GET(req);
    const body = (await res.json()) as { profiles: unknown[] };
    expect(body.profiles).toEqual([]);
  });
});
