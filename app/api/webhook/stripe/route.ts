import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getStripeClient,
  getStripeWebhookSecret,
  mapStripeStatus,
  inferPlanTierFromPriceId,
} from "@/lib/billing/stripe";
import { upsertSubscriptionFromStripe } from "@/lib/billing/service";
import type { PlanTier } from "@/lib/billing/catalog";

function isPlanTier(value: string): value is PlanTier {
  return value === "free" || value === "pro" || value === "premium";
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const userId = (sub.metadata?.user_id as string) ?? null;
  if (!userId) {
    console.warn("[Stripe webhook] subscription missing user_id metadata", sub.id);
    return;
  }

  const firstItem = sub.items?.data?.[0];
  const priceId = (firstItem?.price?.id as string) ?? null;
  const planTier = isPlanTier(sub.metadata?.plan_tier as string)
    ? (sub.metadata.plan_tier as PlanTier)
    : inferPlanTierFromPriceId(priceId);

  const status = mapStripeStatus(sub.status);
  const periodEndTs = firstItem?.current_period_end ?? sub.billing_cycle_anchor;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;
  const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";

  const service = createServiceClient();
  await upsertSubscriptionFromStripe(service, {
    user_id: userId,
    plan_tier: planTier,
    status,
    provider: "stripe",
    provider_subscription_id: sub.id,
    provider_customer_id: customerId,
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    metadata: {
      stripe_status: sub.status,
      price_id: priceId,
      event_at: new Date().toISOString(),
    },
  });
}

export async function POST(req: NextRequest) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  let event: Stripe.Event;
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Stripe webhook] signature verification failed", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.user_id as string) ?? null;
        if (!userId) break;
        const service = createServiceClient();
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
        await upsertSubscriptionFromStripe(service, {
          user_id: userId,
          plan_tier: "free",
          status: "cancelled",
          provider: "stripe",
          provider_subscription_id: sub.id,
          provider_customer_id: customerId,
          current_period_end: null,
          cancel_at_period_end: false,
          metadata: { deleted_at: new Date().toISOString() },
        });
        break;
      }
      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[Stripe webhook] handler error", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
