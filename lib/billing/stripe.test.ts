import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We must reset the stripe client between tests
vi.mock("stripe", () => {
  const MockStripe = vi.fn().mockImplementation(() => ({}));
  return { default: MockStripe };
});

describe("isStripeConfigured", () => {
  const REQUIRED_VARS = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
    "STRIPE_PRICE_PREMIUM",
    "NEXT_PUBLIC_APP_URL",
  ];

  const origEnv = { ...process.env };

  beforeEach(() => {
    // Reset module to clear cached stripeClient
    vi.resetModules();
    // Clear relevant env vars
    REQUIRED_VARS.forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    // Restore original env
    REQUIRED_VARS.forEach((k) => {
      if (origEnv[k]) process.env[k] = origEnv[k];
      else delete process.env[k];
    });
  });

  it("returns false when no env vars set", async () => {
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(false);
  });

  it("returns false when only some vars set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(false);
  });

  it("returns true when all required vars set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
    process.env.STRIPE_PRICE_PRO = "price_pro_123";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium_456";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(true);
  });
});

describe("mapStripeStatus", () => {
  it("maps active status", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("active")).toBe("active");
  });

  it("maps trialing status", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("trialing")).toBe("trialing");
  });

  it("maps past_due status", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("past_due")).toBe("past_due");
  });

  it("maps canceled to cancelled", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("canceled")).toBe("cancelled");
  });

  it("maps unpaid to cancelled", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("unpaid")).toBe("cancelled");
  });

  it("maps incomplete_expired to cancelled", async () => {
    const { mapStripeStatus } = await import("./stripe");
    expect(mapStripeStatus("incomplete_expired")).toBe("cancelled");
  });
});

describe("getPlanTierFromStripePriceId", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_PRICE_PRO = "price_pro_abc";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium_xyz";
  });

  it("returns pro for pro price ID", async () => {
    const { getPlanTierFromStripePriceId } = await import("./stripe");
    expect(getPlanTierFromStripePriceId("price_pro_abc")).toBe("pro");
  });

  it("returns premium for premium price ID", async () => {
    const { getPlanTierFromStripePriceId } = await import("./stripe");
    expect(getPlanTierFromStripePriceId("price_premium_xyz")).toBe("premium");
  });

  it("returns null for unknown price ID", async () => {
    const { getPlanTierFromStripePriceId } = await import("./stripe");
    expect(getPlanTierFromStripePriceId("price_unknown_999")).toBeNull();
  });
});

describe("inferPlanTierFromPriceId", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_PRICE_PRO = "price_pro_abc";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium_xyz";
  });

  it("infers premium from premium price ID", async () => {
    const { inferPlanTierFromPriceId } = await import("./stripe");
    expect(inferPlanTierFromPriceId("price_premium_xyz")).toBe("premium");
  });

  it("infers pro from pro price ID", async () => {
    const { inferPlanTierFromPriceId } = await import("./stripe");
    expect(inferPlanTierFromPriceId("price_pro_abc")).toBe("pro");
  });

  it("defaults to free for null", async () => {
    const { inferPlanTierFromPriceId } = await import("./stripe");
    expect(inferPlanTierFromPriceId(null)).toBe("free");
  });

  it("defaults to free for unknown price ID", async () => {
    const { inferPlanTierFromPriceId } = await import("./stripe");
    expect(inferPlanTierFromPriceId("price_unknown")).toBe("free");
  });
});

describe("getStripeAppUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("strips trailing slash from URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    const { getStripeAppUrl } = await import("./stripe");
    expect(getStripeAppUrl()).toBe("https://app.example.com");
  });

  it("returns URL as-is when no trailing slash", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const { getStripeAppUrl } = await import("./stripe");
    expect(getStripeAppUrl()).toBe("https://app.example.com");
  });
});
