import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoinsAtomic } from "@/lib/economy/coins";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/streak/shield" });

// Single shield = one free "missed day" covered automatically by
// `record_activity_atomic`. Price is intentionally cheap to feel
// approachable — Duolingo-style insurance, not a paywall.
const SHIELD_PRICE = 30;

/**
 * GET /api/streak/shield
 * Returns the user's shield balance + current price.
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data } = await service
    .from("user_streaks")
    .select("shield_count")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    shield_count: data?.shield_count ?? 0,
    price: SHIELD_PRICE,
  });
}

/**
 * POST /api/streak/shield
 * Deducts SHIELD_PRICE coins from the user's primary agent and grants
 * one streak shield. Atomic: if the coin spend fails, the shield is
 * not awarded.
 */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: agents } = await service
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const agentId = agents?.[0]?.id as string | undefined;
  if (!agentId) {
    return NextResponse.json({ error: "No agent" }, { status: 400 });
  }

  let spent = false;
  try {
    spent = await spendCoinsAtomic(agentId, SHIELD_PRICE, "streak_shield");
  } catch (e) {
    log.error("spendCoinsAtomic failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
  if (!spent) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 402 });
  }

  const { data: shields, error } = await service.rpc("add_streak_shield", {
    p_user_id: user.id,
    p_amount: 1,
  });

  if (error) {
    log.error("add_streak_shield failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    shield_count: typeof shields === "number" ? shields : null,
    spent: SHIELD_PRICE,
  });
}
