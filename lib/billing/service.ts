import type { createServiceClient } from "@/lib/supabase/service";
import {
  getPlanDefinition,
  resolveEntitlements,
  type PlanTier,
  type SubscriptionStatus,
} from "@/lib/billing/catalog";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from">;

type SubscriptionRow = {
  cancel_at_period_end?: boolean | null;
  created_at?: string | null;
  current_period_end?: string | null;
  id?: string | null;
  plan_tier?: string | null;
  provider?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
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
    .select(
      "id, plan_tier, status, provider, provider_customer_id, provider_subscription_id, current_period_end, cancel_at_period_end, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as SubscriptionRow | null;
}

export async function upsertSubscriptionFromStripe(
  db: DbClient,
  params: {
    user_id: string;
    plan_tier: "free" | "pro" | "premium";
    status: "active" | "trialing" | "past_due" | "cancelled";
    provider: "stripe";
    provider_subscription_id: string;
    provider_customer_id: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    metadata?: Record<string, unknown>;
  }
) {
  await db.from("user_subscriptions").upsert(
    {
      user_id: params.user_id,
      plan_tier: params.plan_tier,
      status: params.status,
      provider: params.provider,
      provider_subscription_id: params.provider_subscription_id,
      provider_customer_id: params.provider_customer_id,
      current_period_end: params.current_period_end,
      cancel_at_period_end: params.cancel_at_period_end,
      metadata: params.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_subscription_id" }
  );
}

/** Default trial duration in days for new users. */
export const FREE_TRIAL_DAYS = 7;

/**
 * Check if a user is currently within their free trial window.
 * Trial starts at account creation and lasts FREE_TRIAL_DAYS.
 */
export function isWithinFreeTrial(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
  return new Date() < trialEnd;
}

export function getTrialDaysRemaining(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
  const remaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, remaining);
}

export async function getResolvedBillingState(
  db: DbClient,
  userId: string,
  locale: Locale = DEFAULT_LOCALE
) {
  const subscription = await getLatestSubscription(db, userId);
  const planTier: PlanTier = isPlanTier(subscription?.plan_tier) ? subscription.plan_tier : "free";
  const status: SubscriptionStatus = isSubscriptionStatus(subscription?.status) ? subscription.status : "active";

  // If user is on free plan with trialing status, check trial window
  const isTrial = status === "trialing" || (planTier === "free" && isWithinFreeTrial(subscription?.created_at));
  const trialDaysRemaining = isTrial ? getTrialDaysRemaining(subscription?.created_at) : 0;

  return {
    entitlements: resolveEntitlements(planTier),
    plan: getPlanDefinition(planTier, locale),
    subscription: {
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      current_period_end: subscription?.current_period_end ?? null,
      id: subscription?.id ?? null,
      provider_customer_id: subscription?.provider_customer_id ?? null,
      provider: subscription?.provider ?? null,
      status,
    },
    trial: {
      active: isTrial,
      daysRemaining: trialDaysRemaining,
    },
  };
}
