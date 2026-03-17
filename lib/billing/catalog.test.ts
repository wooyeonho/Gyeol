import { describe, it, expect } from "vitest";
import {
  resolveEntitlements,
  formatPlanPrice,
  formatPlanTierLabel,
  formatSubscriptionStatus,
  getPlanDefinition,
  getLocalizedPlanDefinitions,
} from "./catalog";

describe("resolveEntitlements", () => {
  it("free plan has no entitlements", () => {
    const entitlements = resolveEntitlements("free");
    expect(entitlements.advanced_recaps).toBe(false);
    expect(entitlements.long_term_history).toBe(false);
    expect(entitlements.multichannel).toBe(false);
    expect(entitlements.premium_generation).toBe(false);
    expect(entitlements.priority_beta).toBe(false);
  });

  it("pro plan has expected entitlements", () => {
    const entitlements = resolveEntitlements("pro");
    expect(entitlements.advanced_recaps).toBe(true);
    expect(entitlements.long_term_history).toBe(true);
    expect(entitlements.priority_beta).toBe(true);
    // pro does NOT include multichannel or premium_generation
    expect(entitlements.multichannel).toBe(false);
    expect(entitlements.premium_generation).toBe(false);
  });

  it("premium plan has all entitlements", () => {
    const entitlements = resolveEntitlements("premium");
    expect(entitlements.advanced_recaps).toBe(true);
    expect(entitlements.long_term_history).toBe(true);
    expect(entitlements.multichannel).toBe(true);
    expect(entitlements.premium_generation).toBe(true);
    expect(entitlements.priority_beta).toBe(true);
  });
});

describe("formatPlanPrice", () => {
  it("formats free plan as 무료 in Korean", () => {
    const label = formatPlanPrice({ amount: null, currency: "KRW", interval: null }, "ko");
    expect(label).toBe("무료");
  });

  it("formats free plan as Free in English", () => {
    const label = formatPlanPrice({ amount: null, currency: "KRW", interval: null }, "en");
    expect(label).toBe("Free");
  });

  it("formats pro price in Korean with 월 prefix", () => {
    const label = formatPlanPrice({ amount: 19900, currency: "KRW", interval: "month" }, "ko");
    expect(label).toContain("월");
    expect(label).toContain("19,900");
  });

  it("formats pro price in English with /month suffix", () => {
    const label = formatPlanPrice({ amount: 19900, currency: "KRW", interval: "month" }, "en");
    expect(label).toContain("month");
    expect(label).toContain("19,900");
  });

  it("formats premium price in Korean", () => {
    const label = formatPlanPrice({ amount: 39900, currency: "KRW", interval: "month" }, "ko");
    expect(label).toContain("월");
    expect(label).toContain("39,900");
  });
});

describe("formatPlanTierLabel", () => {
  it("returns Premium for premium tier", () => {
    expect(formatPlanTierLabel("premium", "ko")).toBe("Premium");
    expect(formatPlanTierLabel("premium", "en")).toBe("Premium");
  });

  it("returns Pro for pro tier", () => {
    expect(formatPlanTierLabel("pro", "ko")).toBe("Pro");
    expect(formatPlanTierLabel("pro", "en")).toBe("Pro");
  });

  it("returns Free for free tier", () => {
    expect(formatPlanTierLabel("free", "ko")).toBe("Free");
    expect(formatPlanTierLabel("free", "en")).toBe("Free");
  });

  it("returns Free for null or undefined", () => {
    expect(formatPlanTierLabel(null, "ko")).toBe("Free");
    expect(formatPlanTierLabel(undefined, "en")).toBe("Free");
  });
});

describe("formatSubscriptionStatus", () => {
  it("formats active status", () => {
    expect(formatSubscriptionStatus("active", "ko")).toBe("정상 사용 중");
    expect(formatSubscriptionStatus("active", "en")).toBe("Active");
  });

  it("formats trialing status", () => {
    expect(formatSubscriptionStatus("trialing", "ko")).toBe("체험 중");
    expect(formatSubscriptionStatus("trialing", "en")).toBe("Trialing");
  });

  it("formats past_due status", () => {
    expect(formatSubscriptionStatus("past_due", "ko")).toBe("결제 확인 필요");
    expect(formatSubscriptionStatus("past_due", "en")).toBe("Past due");
  });

  it("formats cancelled status", () => {
    expect(formatSubscriptionStatus("cancelled", "ko")).toBe("해지됨");
    expect(formatSubscriptionStatus("cancelled", "en")).toBe("Cancelled");
  });

  it("handles null/undefined status", () => {
    expect(formatSubscriptionStatus(null, "ko")).toBe("아직 연결되지 않음");
    expect(formatSubscriptionStatus(undefined, "en")).toBe("Not connected yet");
  });
});

describe("getPlanDefinition", () => {
  it("returns Korean copy for ko locale", () => {
    const plan = getPlanDefinition("free", "ko");
    expect(plan.tier).toBe("free");
    expect(plan.cta).toBe("지금 시작하기");
    expect(plan.features.length).toBeGreaterThan(0);
    expect(plan.priceLabel).toBe("무료");
  });

  it("returns English copy for en locale", () => {
    const plan = getPlanDefinition("free", "en");
    expect(plan.tier).toBe("free");
    expect(plan.cta).toBe("Start now");
    expect(plan.priceLabel).toBe("Free");
  });

  it("returns pro plan with badge", () => {
    const planKo = getPlanDefinition("pro", "ko");
    expect(planKo.badge).toBe("추천");
    const planEn = getPlanDefinition("pro", "en");
    expect(planEn.badge).toBe("Recommended");
  });

  it("returns premium plan definition", () => {
    const plan = getPlanDefinition("premium", "en");
    expect(plan.tier).toBe("premium");
    expect(plan.price.amount).toBe(39900);
  });
});

describe("getLocalizedPlanDefinitions", () => {
  it("returns all three plans for Korean locale", () => {
    const plans = getLocalizedPlanDefinitions("ko");
    expect(plans.free.tier).toBe("free");
    expect(plans.pro.tier).toBe("pro");
    expect(plans.premium.tier).toBe("premium");
    expect(plans.free.cta).toBe("지금 시작하기");
  });

  it("returns all three plans for English locale", () => {
    const plans = getLocalizedPlanDefinitions("en");
    expect(plans.free.cta).toBe("Start now");
    expect(plans.pro.badge).toBe("Recommended");
  });
});
