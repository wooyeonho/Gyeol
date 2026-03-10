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

describe("/api/billing/me contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current plan and entitlements for authed user", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        expect(table).toBe("user_subscriptions");
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      plan_tier: "pro",
                      status: "active",
                      provider: "stripe",
                      current_period_end: new Date().toISOString(),
                      cancel_at_period_end: false,
                    },
                  }),
                }),
              }),
            }),
          }),
        };
      },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;

    const plan = body.plan as Record<string, unknown>;
    expect(plan.tier).toBe("pro");
    expect(typeof plan.priceLabel).toBe("string");

    const entitlements = body.entitlements as Record<string, unknown>;
    expect(typeof entitlements.advanced_recaps).toBe("boolean");
    expect(typeof entitlements.priority_beta).toBe("boolean");

    const subscription = body.subscription as Record<string, unknown>;
    expect(subscription.status).toBe("active");
  });
});
