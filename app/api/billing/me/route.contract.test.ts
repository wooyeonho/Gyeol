import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DELETE, GET, POST } from "./route";

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

  it("activates a paid plan via POST", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "sub-old",
          plan_tier: "free",
          status: "active",
          provider: "mock",
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "sub-new",
          plan_tier: "premium",
          status: "active",
          provider: "mock",
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        },
      });

    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table !== "user_subscriptions") throw new Error(`unexpected table: ${table}`);
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle,
                }),
              }),
            }),
          }),
          insert,
          update,
        };
      },
    });

    const response = await POST(
      new Request("http://localhost/api/billing/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: "premium" }),
      })
    );
    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalled();
  });

  it("blocks mock billing writes in production when disabled", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFlag = process.env.ENABLE_MOCK_BILLING;
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "production";
    delete env.ENABLE_MOCK_BILLING;

    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/billing/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: "premium" }),
      })
    );
    expect(response.status).toBe(403);

    env.NODE_ENV = previousNodeEnv;
    if (previousFlag == null) delete env.ENABLE_MOCK_BILLING;
    else env.ENABLE_MOCK_BILLING = previousFlag;
  });

  it("downgrades to free via DELETE", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "sub-old",
          plan_tier: "pro",
          status: "active",
          provider: "mock",
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "sub-free",
          plan_tier: "free",
          status: "active",
          provider: "mock",
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        },
      });

    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table !== "user_subscriptions") throw new Error(`unexpected table: ${table}`);
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle,
                }),
              }),
            }),
          }),
          insert,
          update,
        };
      },
    });

    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalled();
  });
});
