import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripeAppUrl, getStripePriceId, isStripeConfigured } from "@/lib/billing/stripe";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { parseBody, billingCheckoutBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

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
    const parsed = await parseBody(request, billingCheckoutBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const planTier = parsed.data.plan_tier;

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
    logger.error("POST /api/billing/checkout error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
