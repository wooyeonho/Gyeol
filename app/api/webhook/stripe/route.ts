import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlanTierFromStripePriceId, getStripe, getStripeWebhookSecret, isStripeConfigured, mapStripeStatus } from "@/lib/billing/stripe";
import { upsertSubscriptionFromStripe } from "@/lib/billing/service";
import { logger } from "@/lib/logger";

function extractPlanTier(subscription: Stripe.Subscription) {
  const metadataPlanTier = subscription.metadata?.plan_tier;
  if (metadataPlanTier === "pro" || metadataPlanTier === "premium") return metadataPlanTier;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  if (!priceId) return "free";
  return getPlanTierFromStripePriceId(priceId) ?? "free";
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const payload = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());

    const service = createServiceClient();
    await service.from("stripe_webhook_events").upsert(
      {
        event_id: event.id,
        event_type: event.type,
        payload: event,
      },
      { onConflict: "event_id" }
    );

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id ?? "";
      if (userId) {
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null;
        await upsertSubscriptionFromStripe(service, {
          user_id: userId,
          plan_tier: event.type === "customer.subscription.deleted" ? "free" : extractPlanTier(subscription),
          status: event.type === "customer.subscription.deleted" ? "cancelled" : mapStripeStatus(subscription.status),
          provider: "stripe",
          provider_subscription_id: subscription.id,
          provider_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? "",
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: event.type === "customer.subscription.deleted" ? false : subscription.cancel_at_period_end,
          metadata: {
            event_type: event.type,
            livemode: subscription.livemode,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("POST /api/webhook/stripe error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
