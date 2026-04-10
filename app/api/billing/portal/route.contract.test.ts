import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: "u1" } },
          }),
      },
    })
  ),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: {
                    provider: "stripe",
                    provider_customer_id: "cus_test",
                  },
                })
              ),
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/security/csrf", () => ({
  verifyCsrfOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/billing/stripe", () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripeAppUrl: vi.fn(() => "https://example.com"),
  getStripe: vi.fn(() => ({
    billingPortal: {
      sessions: {
        create: vi.fn(() => Promise.resolve({ url: "https://billing.test/session" })),
      },
    },
  })),
}));

describe("/api/billing/portal contract", () => {
  it("returns portal url when stripe customer exists", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portal_url).toBe("https://billing.test/session");
  });
});
