import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoinsAtomic } from "@/lib/economy/coins";
import { checkRateLimit } from "@/lib/rate-limit";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

/** Price per shield, in coins. */
export const SHIELD_PRICE = 50;
/** Maximum shields a single agent can hold at once. */
export const SHIELD_MAX = 3;

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`shield-purchase:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const service = createServiceClient();
    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!agent?.id) {
      return NextResponse.json({ error: "No agent" }, { status: 404 });
    }

    const { data: state } = await service
      .from("agent_state")
      .select("coins, config")
      .eq("agent_id", agent.id)
      .single();
    const config = (state?.config ?? {}) as Record<string, unknown>;
    const currentShields =
      typeof config.streak_shields === "number" ? (config.streak_shields as number) : 0;
    const currentCoins = Number(state?.coins ?? 0);

    if (currentShields >= SHIELD_MAX) {
      return NextResponse.json(
        { error: "Shield cap reached", cap: SHIELD_MAX },
        { status: 400 },
      );
    }
    if (currentCoins < SHIELD_PRICE) {
      return NextResponse.json(
        { error: "Insufficient coins", price: SHIELD_PRICE, balance: currentCoins },
        { status: 400 },
      );
    }

    const spent = await spendCoinsAtomic(agent.id, SHIELD_PRICE, "streak_shield_purchase");
    if (!spent) {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    }

    const nextShields = currentShields + 1;
    const nextConfig = { ...config, streak_shields: nextShields };
    const { error: updateError } = await service
      .from("agent_state")
      .update({ config: nextConfig })
      .eq("agent_id", agent.id);

    if (updateError) {
      // Refund on failure.
      await service.rpc("add_coins_atomic", {
        p_agent_id: agent.id,
        p_amount: SHIELD_PRICE,
        p_reason: "streak_shield_purchase_refund",
      });
      return NextResponse.json({ error: "Failed to credit shield" }, { status: 500 });
    }

    await service.from("autonomous_logs").insert({
      agent_id: agent.id,
      action_type: "streak_shield_purchase",
      summary: `Purchased streak shield for ${SHIELD_PRICE} coins`,
    });

    return NextResponse.json({
      ok: true,
      shields: nextShields,
      price_paid: SHIELD_PRICE,
      cap: SHIELD_MAX,
    });
  } catch (e) {
    logRouteError("streak/shield/purchase POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
