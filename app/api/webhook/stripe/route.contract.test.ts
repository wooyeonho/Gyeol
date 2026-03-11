import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/billing/stripe", () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripeWebhookSecret: vi.fn(() => "whsec_test"),
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn((_payload: string, _sig: string, _secret: string) => ({
        id: "evt_1",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            status: "active",
            cancel_at_period_end: false,
            customer: "cus_1",
            livemode: false,
            metadata: { user_id: "user-1", plan_tier: "pro" },
            items: {
              data: [
                {
                  current_period_end: Math.floor(Date.now() / 1000) + 86400,
                  price: { id: "price_pro" },
                },
              ],
            },
          },
        },
      })),
    },
  })),
  getPlanTierFromStripePriceId: vi.fn(() => "pro"),
  mapStripeStatus: vi.fn(() => "active"),
}));

vi.mock("@/lib/billing/service", () => ({
  upsertSubscriptionFromStripe: vi.fn(() => Promise.resolve()),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { upsertSubscriptionFromStripe } from "@/lib/billing/service";
import { POST } from "./route";

describe("/api/webhook/stripe contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceClient as Mock).mockReturnValue({
      from: vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve()),
      })),
    });
  });

  it("accepts subscription update webhooks", async () => {
    const request = new Request("http://localhost/api/webhook/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_test",
      },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upsertSubscriptionFromStripe).toHaveBeenCalled();
  });
});
