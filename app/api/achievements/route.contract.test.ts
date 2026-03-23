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

function mockAuth(userId: string | null = "u1") {
  (createServerSupabase as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

function mockService() {
  const insertFn = vi.fn().mockResolvedValue({});
  const rpcFn = vi.fn().mockResolvedValue({});
  (createServiceClient as Mock).mockReturnValue({
    from: (table: string) => {
      if (table === "agents") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { id: "a1" } }) }) }),
        };
      }
      if (table === "agent_state") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { total_messages: 10, streak_days: 3, gen_level: 2, coins: 100, genome: { mutations: [] } },
              }),
            }),
          }),
        };
      }
      if (table === "agent_achievements") {
        return {
          select: () => ({ eq: async () => ({ data: [] }) }),
          insert: insertFn,
          update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
        };
      }
      return {};
    },
    rpc: rpcFn,
  });
  return { insertFn, rpcFn };
}

describe("/api/achievements contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns achievements list with expected fields", async () => {
    mockAuth();
    mockService();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      achievements: Array<{ id: string; unlocked: boolean }>;
      total_unlocked: number;
      total_available: number;
    };
    expect(Array.isArray(body.achievements)).toBe(true);
    expect(typeof body.total_unlocked).toBe("number");
    expect(typeof body.total_available).toBe("number");
  });

  it("returns 401 when unauthorized", async () => {
    mockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when no agent", async () => {
    mockAuth();
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
