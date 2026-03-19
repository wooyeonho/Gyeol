import { describe, it, expect, vi } from "vitest";
import type { createServiceClient } from "@/lib/supabase/service";
import { getLatestSubscription, upsertSubscriptionFromStripe, getResolvedBillingState } from "./service";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from">;

function makeDb(overrides: Record<string, unknown> = {}): { from: DbClient["from"]; _chain: Record<string, unknown> } {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn().mockReturnValue(chain) as unknown as DbClient["from"],
    _chain: chain,
  };
}

describe("getLatestSubscription", () => {
  it("returns null when no subscription found", async () => {
    const db = makeDb();
    const result = await getLatestSubscription(db as unknown as DbClient, "user-123");
    expect(result).toBeNull();
  });

  it("returns subscription row when found", async () => {
    const mockRow = {
      id: "sub-1",
      plan_tier: "pro",
      status: "active",
      provider: "stripe",
      provider_subscription_id: "sub_stripe_123",
      provider_customer_id: "cus_abc",
      current_period_end: "2026-04-01T00:00:00Z",
      cancel_at_period_end: false,
      created_at: "2026-01-01T00:00:00Z",
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    const result = await getLatestSubscription(db as unknown as DbClient, "user-123");
    expect(result).toEqual(mockRow);
    expect(db.from).toHaveBeenCalledWith("user_subscriptions");
  });
});

describe("upsertSubscriptionFromStripe", () => {
  it("calls upsert with correct params", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    const params = {
      user_id: "user-456",
      plan_tier: "pro" as const,
      status: "active" as const,
      provider: "stripe" as const,
      provider_subscription_id: "sub_stripe_999",
      provider_customer_id: "cus_xyz",
      current_period_end: "2026-05-01T00:00:00Z",
      cancel_at_period_end: false,
    };

    await upsertSubscriptionFromStripe(db as unknown as DbClient, params);

    expect(db.from).toHaveBeenCalledWith("user_subscriptions");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-456",
        plan_tier: "pro",
        status: "active",
        provider: "stripe",
        provider_subscription_id: "sub_stripe_999",
        provider_customer_id: "cus_xyz",
        cancel_at_period_end: false,
        metadata: {},
      }),
      { onConflict: "provider_subscription_id" }
    );
  });

  it("passes metadata when provided", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    await upsertSubscriptionFromStripe(db as unknown as DbClient, {
      user_id: "user-1",
      plan_tier: "premium",
      status: "trialing",
      provider: "stripe",
      provider_subscription_id: "sub_1",
      provider_customer_id: "cus_1",
      current_period_end: null,
      cancel_at_period_end: false,
      metadata: { priceId: "price_abc" },
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { priceId: "price_abc" } }),
      expect.anything()
    );
  });
});

describe("getResolvedBillingState", () => {
  it("returns free plan defaults when no subscription", async () => {
    const db = makeDb();
    const state = await getResolvedBillingState(db as unknown as DbClient, "user-789", "en");

    expect(state.plan.tier).toBe("free");
    expect(state.entitlements.advanced_recaps).toBe(false);
    expect(state.entitlements.multichannel).toBe(false);
    expect(state.subscription.id).toBeNull();
    expect(state.subscription.provider).toBeNull();
  });

  it("returns pro plan with correct entitlements for active pro subscription", async () => {
    const mockRow = {
      id: "sub-pro-1",
      plan_tier: "pro",
      status: "active",
      provider: "stripe",
      provider_customer_id: "cus_pro",
      provider_subscription_id: "sub_pro_abc",
      current_period_end: "2026-06-01T00:00:00Z",
      cancel_at_period_end: false,
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    const state = await getResolvedBillingState(db as unknown as DbClient, "user-pro", "ko");

    expect(state.plan.tier).toBe("pro");
    expect(state.entitlements.advanced_recaps).toBe(true);
    expect(state.entitlements.long_term_history).toBe(true);
    expect(state.entitlements.priority_beta).toBe(true);
    expect(state.entitlements.multichannel).toBe(false);
    expect(state.subscription.status).toBe("active");
    expect(state.subscription.id).toBe("sub-pro-1");
  });

  it("returns premium plan with all entitlements", async () => {
    const mockRow = {
      id: "sub-prem-1",
      plan_tier: "premium",
      status: "active",
      provider: "stripe",
      provider_customer_id: "cus_prem",
      provider_subscription_id: "sub_prem_abc",
      current_period_end: "2026-06-01T00:00:00Z",
      cancel_at_period_end: false,
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    const state = await getResolvedBillingState(db as unknown as DbClient, "user-prem", "en");

    expect(state.plan.tier).toBe("premium");
    expect(state.entitlements.multichannel).toBe(true);
    expect(state.entitlements.premium_generation).toBe(true);
  });

  it("defaults to free plan when plan_tier is unknown string", async () => {
    const mockRow = {
      id: "sub-unknown",
      plan_tier: "enterprise", // unknown tier
      status: "active",
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(chain) };

    const state = await getResolvedBillingState(db as unknown as DbClient, "user-unk", "en");
    expect(state.plan.tier).toBe("free");
  });
});
