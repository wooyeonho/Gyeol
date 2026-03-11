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

function createAuthedClient(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
  };
}

function createProductOpsService() {
  return {
    from(table: string) {
      if (table !== "product_events") throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          gte: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  { event_name: "signup_completed", path: "/signup", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "guest_completed", path: "/login", created_at: new Date().toISOString(), properties: {} },
                  {
                    event_name: "experiment_assigned",
                    path: "/",
                    created_at: new Date().toISOString(),
                    properties: { experiment_key: "first_message_onboarding", variant: "identity" },
                  },
                  {
                    event_name: "first_message_sent",
                    path: "/",
                    created_at: new Date().toISOString(),
                    properties: { experiment_key: "first_message_onboarding", experiment_variant: "identity" },
                  },
                  { event_name: "message_sent", path: "/", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "activity_opened", path: "/activity", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "plans_opened", path: "/plans", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "upgrade_cta_clicked", path: "/plans", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "page_view", path: "/plans", created_at: new Date().toISOString(), properties: {} },
                  { event_name: "page_view", path: "/plans", created_at: new Date().toISOString(), properties: {} },
                ],
              }),
            }),
          }),
          order: () => ({
            limit: async () => ({
              data: [
                { event_name: "upgrade_cta_clicked", path: "/plans", created_at: new Date().toISOString(), properties: {} },
                { event_name: "plans_opened", path: "/plans", created_at: new Date().toISOString(), properties: {} },
              ],
            }),
          }),
        }),
      };
    },
  };
}

describe("/api/ops/product contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPS_ADMIN_USER_IDS = "user-1";
  });

  it("returns 401 when not logged in", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient(null));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-2"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns product analytics summary payload", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-1"));
    (createServiceClient as Mock).mockReturnValue(createProductOpsService());

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.checked_at).toBe("string");

    const activation = body.activation_7d as Record<string, unknown>;
    expect(typeof activation.entry_completions).toBe("number");
    expect(typeof activation.first_messages).toBe("number");
    expect(typeof activation.rate).toBe("number");

    const upgrade = body.upgrade_interest_7d as Record<string, unknown>;
    expect(typeof upgrade.plans_opened).toBe("number");
    expect(typeof upgrade.upgrade_clicks).toBe("number");
    expect(typeof upgrade.click_rate).toBe("number");

    expect(Array.isArray(body.onboarding_experiment_7d)).toBe(true);
    expect(Array.isArray(body.top_paths_7d)).toBe(true);
    expect(Array.isArray(body.recent_events)).toBe(true);
  });
});
