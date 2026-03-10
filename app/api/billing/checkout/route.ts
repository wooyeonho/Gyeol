import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStripeClient,
  getPriceIdForPlan,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import type { PlanTier } from "@/lib/billing/catalog";

function isPlanTier(value: unknown): value is PlanTier {
  return value === "pro" || value === "premium";
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured. Use mock upgrade from Plans page." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planTier = body?.plan_tier;
  if (!isPlanTier(planTier)) {
    return NextResponse.json(
      { error: "plan_tier must be pro or premium" },
      { status: 400 }
    );
  }

  const priceId = getPriceIdForPlan(planTier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Price not configured for ${planTier}. Set STRIPE_PRICE_PRO or STRIPE_PRICE_PREMIUM.` },
      { status: 503 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const baseUrl = origin.replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        trial_period_days: body.trial_days ?? undefined,
      },
      metadata: { user_id: user.id, plan_tier: planTier },
      success_url: `${baseUrl}/plans?success=1`,
      cancel_url: `${baseUrl}/plans?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error", e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
