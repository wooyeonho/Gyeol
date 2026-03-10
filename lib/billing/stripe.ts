import Stripe from "stripe";
import type { PlanTier } from "./catalog";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY);
}

export function getStripeWebhookSecret(): string | undefined {
  return STRIPE_WEBHOOK_SECRET;
}

export function getStripeClient(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  return new Stripe(STRIPE_SECRET_KEY);
}

/** Stripe Price ID per plan tier. Set via env: STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM */
export function getPriceIdForPlan(tier: PlanTier): string | null {
  if (tier === "free") return null;
  const key = tier === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_PREMIUM";
  return process.env[key] ?? null;
}

/** Map Stripe subscription status to our SubscriptionStatus */
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "trialing" | "past_due" | "cancelled" {
  if (status === "active" || status === "trialing") return status;
  if (status === "past_due") return "past_due";
  return "cancelled";
}

/** Map Stripe price ID to plan tier (fallback when metadata missing) */
export function inferPlanTierFromPriceId(priceId: string | null): PlanTier {
  const proPrice = process.env.STRIPE_PRICE_PRO;
  const premiumPrice = process.env.STRIPE_PRICE_PREMIUM;
  if (priceId === premiumPrice) return "premium";
  if (priceId === proPrice) return "pro";
  return "free";
}
