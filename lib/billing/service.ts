import type { createServiceClient } from "@/lib/supabase/service";
import {
  PLAN_DEFINITIONS,
  resolveEntitlements,
  type PlanTier,
  type SubscriptionStatus,
} from "@/lib/billing/catalog";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from">;

type SubscriptionRow = {
  cancel_at_period_end?: boolean | null;
  created_at?: string | null;
  current_period_end?: string | null;
  id?: string | null;
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

export async function getLatestSubscription(db: DbClient, userId: string) {
  const { data } = await db
    .from("user_subscriptions")
    .select("id, plan_tier, status, provider, current_period_end, cancel_at_period_end, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as SubscriptionRow | null;
}

export async function getResolvedBillingState(db: DbClient, userId: string) {
  const subscription = await getLatestSubscription(db, userId);
  const planTier: PlanTier = isPlanTier(subscription?.plan_tier) ? subscription.plan_tier : "free";
  const status: SubscriptionStatus = isSubscriptionStatus(subscription?.status) ? subscription.status : "active";

  return {
    entitlements: resolveEntitlements(planTier),
    plan: PLAN_DEFINITIONS[planTier],
    subscription: {
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      current_period_end: subscription?.current_period_end ?? null,
      id: subscription?.id ?? null,
      provider: subscription?.provider ?? null,
      status,
    },
  };
}
