import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getStripe,
  getStripeWebhookSecret,
  inferPlanTierFromPriceId,
  isStripeConfigured,
  mapStripeStatus,
} from "@/lib/billing/stripe";
import { upsertSubscriptionFromStripe } from "@/lib/billing/service";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", err instanceof Error ? err : { error: err });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (!userId || !session.subscription) break;

        const stripe = getStripe();
        const subResponse = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        // Stripe v20+ returns Response<Subscription>; unwrap if needed
        const sub: Stripe.Subscription =
          "data" in subResponse && typeof (subResponse as { data?: unknown }).data === "object"
            ? ((subResponse as unknown as { data: Stripe.Subscription }).data)
            : (subResponse as unknown as Stripe.Subscription);
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id ?? null;
        const planTier = inferPlanTierFromPriceId(priceId);
        // Stripe v20: current_period_end lives on SubscriptionItem, not Subscription
        const periodEnd = firstItem?.current_period_end;

        if (planTier !== "free") {
          await upsertSubscriptionFromStripe(service, {
            user_id: userId,
            plan_tier: planTier,
            status: mapStripeStatus(sub.status),
            provider: "stripe",
            provider_subscription_id: sub.id,
            provider_customer_id:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : new Date().toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            metadata: { source: "webhook", event_type: event.type },
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subObj = event.data.object as Stripe.Subscription;
        const userId = subObj.metadata?.user_id;
        if (!userId) break;

        const firstSubItem = subObj.items.data[0];
        const priceId = firstSubItem?.price?.id ?? null;
        const planTier =
          event.type === "customer.subscription.deleted"
            ? ("free" as const)
            : inferPlanTierFromPriceId(priceId);
        const subPeriodEnd = firstSubItem?.current_period_end;

        await upsertSubscriptionFromStripe(service, {
          user_id: userId,
          plan_tier: planTier,
          status: mapStripeStatus(subObj.status),
          provider: "stripe",
          provider_subscription_id: subObj.id,
          provider_customer_id:
            typeof subObj.customer === "string"
              ? subObj.customer
              : subObj.customer.id,
          current_period_end: subPeriodEnd
            ? new Date(subPeriodEnd * 1000).toISOString()
            : new Date().toISOString(),
          cancel_at_period_end: subObj.cancel_at_period_end,
          metadata: { source: "webhook", event_type: event.type },
        });
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (err) {
    logger.error("Stripe webhook processing error", err instanceof Error ? err : { error: err });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
