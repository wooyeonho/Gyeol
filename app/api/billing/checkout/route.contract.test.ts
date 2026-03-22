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
  getStripe: vi.fn(() => null),
  getStripeAppUrl: vi.fn(() => "https://example.com"),
  getStripePriceId: vi.fn(() => "price_test"),
}));

describe("/api/billing/checkout contract", () => {
  it("returns 503 when Stripe not configured", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost", Host: "localhost" },
      body: JSON.stringify({ plan_tier: "pro" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(503);
  });
});
