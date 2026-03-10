import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: "u1", email: "u@test.com" } },
          }),
      },
    })
  ),
}));

vi.mock("@/lib/billing/stripe", () => ({
  isStripeConfigured: vi.fn(() => false),
  getPriceIdForPlan: vi.fn(() => null),
  getStripeClient: vi.fn(() => null),
}));

describe("/api/billing/checkout contract", () => {
  it("returns 503 when Stripe not configured", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://x/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: "pro" }),
      })
    );
    expect(res.status).toBe(503);
  });
});
