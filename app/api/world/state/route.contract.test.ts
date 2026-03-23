import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function mockAuth(userId: string | null = "u1") {
  (createClient as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

describe("/api/world/state contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns worldState on success", async () => {
    mockAuth();
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { weather: { name: "Aurora" }, collective_emotion: { calm: 0.7 } },
            }),
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { worldState: Record<string, unknown> };
    expect(body.worldState).toHaveProperty("weather");
  });

  it("returns null worldState when no user", async () => {
    mockAuth(null);
    const res = await GET();
    const body = (await res.json()) as { worldState: null };
    expect(body.worldState).toBeNull();
  });
});
