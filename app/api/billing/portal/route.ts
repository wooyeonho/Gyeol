import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestSubscription } from "@/lib/billing/service";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, getStripeAppUrl, isStripeConfigured } from "@/lib/billing/stripe";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`billing-portal:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const service = createServiceClient();
    const subscription = await getLatestSubscription(service, user.id);
    const customerId = subscription?.provider_customer_id ?? null;
    if (!customerId || subscription?.provider !== "stripe") {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getStripeAppUrl()}/plans`,
    });

    return NextResponse.json({ portal_url: portal.url, url: portal.url });
  } catch (error) {
    logger.error("POST /api/billing/portal error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
