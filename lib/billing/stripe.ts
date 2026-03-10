import Stripe from "stripe";
import { type PlanTier } from "@/lib/billing/catalog";

type StripePlanTier = Exclude<PlanTier, "free">;

let stripeClient: Stripe | null = null;

function getRequiredEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required Stripe env: ${key}`);
  return value;
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_PRO &&
    process.env.STRIPE_PRICE_PREMIUM &&
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function getStripe() {
  if (stripeClient) return stripeClient;
  stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  return stripeClient;
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceId(planTier: StripePlanTier) {
  if (planTier === "pro") return getRequiredEnv("STRIPE_PRICE_PRO");
  return getRequiredEnv("STRIPE_PRICE_PREMIUM");
}

export function getPlanTierFromStripePriceId(priceId: string): StripePlanTier | null {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  return null;
}

export function getStripeAppUrl() {
  return getRequiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

export function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "trialing" | "past_due" | "cancelled" {
  if (status === "active" || status === "trialing") return status;
  if (status === "past_due") return "past_due";
  return "cancelled";
}

export function inferPlanTierFromPriceId(priceId: string | null): PlanTier {
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}
