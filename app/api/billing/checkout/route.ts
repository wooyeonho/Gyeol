import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type PlanTier } from "@/lib/billing/catalog";
import { getStripe, getStripeAppUrl, getStripePriceId, isStripeConfigured } from "@/lib/billing/stripe";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

function isPaidPlanTier(value: unknown): value is Exclude<PlanTier, "free"> {
  return value === "pro" || value === "premium";
}

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const planTier = body?.plan_tier;
    if (!isPaidPlanTier(planTier)) {
      return NextResponse.json({ error: "plan_tier must be pro or premium" }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = getStripeAppUrl();
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${appUrl}/plans?canceled=1`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: getStripePriceId(planTier),
          quantity: 1,
        },
      ],
      metadata: {
        plan_tier: planTier,
        user_id: user.id,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          plan_tier: planTier,
          user_id: user.id,
        },
      },
      success_url: `${appUrl}/plans?success=1&session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({
      url: session.url,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("POST /api/billing/checkout error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
