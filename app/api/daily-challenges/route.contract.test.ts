import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import { createServerSupabase } from "@/lib/supabase/server";
import { GET } from "./route";

function mockAuth(userId: string | null = "u1") {
  (createServerSupabase as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

describe("/api/daily-challenges contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns today's challenges", async () => {
    mockAuth();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      date: string;
      challenges: Array<{ id: string; difficulty: string; label: string }>;
      perfect_day_bonus: unknown;
    };
    expect(typeof body.date).toBe("string");
    expect(Array.isArray(body.challenges)).toBe(true);
    expect(body.challenges.length).toBeGreaterThan(0);
    expect(body.challenges[0]).toHaveProperty("id");
    expect(body.challenges[0]).toHaveProperty("difficulty");
    expect(body.challenges[0]).toHaveProperty("label");
  });

  it("returns 401 when unauthorized", async () => {
    mockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
