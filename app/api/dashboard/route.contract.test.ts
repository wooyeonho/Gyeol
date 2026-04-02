import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

function mockDashboardService() {
  return {
    from(table: string) {
      if (table === "agents") {
        return {
          select: async () => ({ count: 12 }),
        };
      }
      if (table === "social_logs") {
        return {
          select: async () => ({ count: 33 }),
        };
      }
      if (table === "world_state") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  collective_emotion: { calm: 0.7, joy: 0.3 },
                  weather: { name: "clear" },
                },
              }),
            }),
          }),
        };
      }
      if (table === "artifacts") {
        return {
          select: async () => ({ count: 5 }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("/api/dashboard contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceClient as Mock).mockReturnValue(mockDashboardService());
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "test-user-id" } } }),
      },
    });
  });

  it("returns public dashboard contract fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(typeof body.agent_count).toBe("number");
    expect(typeof body.social_count).toBe("number");
    expect(typeof body.artifact_count).toBe("number");
    expect(typeof body.weather_name === "string" || body.weather_name == null).toBe(true);
    expect(typeof body.collective_emotion === "object" || body.collective_emotion == null).toBe(true);
  });
});
