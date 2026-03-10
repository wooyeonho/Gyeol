import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_DEFINITIONS, resolveEntitlements, type PlanTier, type SubscriptionStatus } from "@/lib/billing/catalog";

type SubscriptionRow = {
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  plan_tier?: string | null;
  provider?: string | null;
  status?: string | null;
};

function isPlanTier(value: string | null | undefined): value is PlanTier {
  return value === "free" || value === "pro" || value === "premium";
}

function isSubscriptionStatus(value: string | null | undefined): value is SubscriptionStatus {
  return value === "active" || value === "trialing" || value === "past_due" || value === "cancelled";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: subscriptionRow } = await service
      .from("user_subscriptions")
      .select("plan_tier, status, provider, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscription = (subscriptionRow ?? null) as SubscriptionRow | null;
    const planTier: PlanTier = isPlanTier(subscription?.plan_tier) ? subscription!.plan_tier : "free";
    const status: SubscriptionStatus =
      isSubscriptionStatus(subscription?.status) ? subscription!.status : "active";

    return NextResponse.json({
      entitlements: resolveEntitlements(planTier),
      plan: PLAN_DEFINITIONS[planTier],
      subscription: {
        cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
        current_period_end: subscription?.current_period_end ?? null,
        provider: subscription?.provider ?? null,
        status,
      },
    });
  } catch (error) {
    console.error("GET /api/billing/me error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
