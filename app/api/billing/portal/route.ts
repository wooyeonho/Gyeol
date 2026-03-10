import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripeClient, isStripeConfigured } from "@/lib/billing/stripe";
import { getLatestSubscription } from "@/lib/billing/service";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const subscription = await getLatestSubscription(service, user.id);
  const customerId =
    (subscription as { provider_customer_id?: string | null } | null)?.provider_customer_id ?? null;

  if (!customerId || subscription?.provider !== "stripe") {
    return NextResponse.json(
      { error: "No Stripe subscription found. Upgrade first." },
      { status: 400 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const baseUrl = origin.replace(/\/$/, "");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/plans`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe portal error", e);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
