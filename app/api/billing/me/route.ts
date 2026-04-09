import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { type PlanTier } from "@/lib/billing/catalog";
import { getLatestSubscription, getResolvedBillingState } from "@/lib/billing/service";
import { isMockBillingEnabled } from "@/lib/billing/mock-billing";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveLocale, type Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/logger";

function isPlanTier(value: unknown): value is PlanTier {
  return value === "free" || value === "pro" || value === "premium";
}

function getRequestLocale(request?: Request): Locale {
  return resolveLocale({
    acceptLanguage: request?.headers.get("accept-language") ?? null,
    cookieHeader: request?.headers.get("cookie") ?? null,
  });
}

export async function GET(request?: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    return NextResponse.json(await getResolvedBillingState(service, user.id, getRequestLocale(request)));
  } catch (error) {
    logger.error("GET /api/billing/me error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
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

  const allowed = await checkRateLimit(`billing-me:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!isMockBillingEnabled()) {
    return NextResponse.json({ error: "Mock billing disabled" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const planTier = body?.plan_tier;
    if (!isPlanTier(planTier) || planTier === "free") {
      return NextResponse.json({ error: "plan_tier must be pro or premium" }, { status: 400 });
    }

    const service = createServiceClient();
    const current = await getLatestSubscription(service, user.id);
    if (current?.id) {
      await service
        .from("user_subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("id", current.id);
    }

    await service.from("user_subscriptions").insert({
      user_id: user.id,
      plan_tier: planTier,
      status: "active",
      provider: "mock",
      current_period_end: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      metadata: { source: "product_ui" },
    });

    return NextResponse.json(await getResolvedBillingState(service, user.id, getRequestLocale(request)), { status: 201 });
  } catch (error) {
    logger.error("POST /api/billing/me error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`billing-me:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!isMockBillingEnabled()) {
    return NextResponse.json({ error: "Mock billing disabled" }, { status: 403 });
  }

  try {
    const service = createServiceClient();
    const current = await getLatestSubscription(service, user.id);
    if (current?.id) {
      await service
        .from("user_subscriptions")
        .update({
          cancel_at_period_end: true,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id);
    }

    await service.from("user_subscriptions").insert({
      user_id: user.id,
      plan_tier: "free",
      status: "active",
      provider: "mock",
      current_period_end: null,
      metadata: { source: "product_ui_downgrade" },
    });

    return NextResponse.json(await getResolvedBillingState(service, user.id, getRequestLocale(request)));
  } catch (error) {
    logger.error("DELETE /api/billing/me error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
