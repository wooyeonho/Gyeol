import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRewardExpiryStatus } from "@/lib/retention/reward-expiry";
import { checkDuoStreakRisk } from "@/lib/retention/duo-streak-alert";
import { logWarn } from "@/lib/ops/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/retention-status
 *
 * Authenticated endpoint returning per-user retention data:
 * - reward_expiry: countdown for expiring unclaimed rewards
 * - duo_streak_risk: alert when a shared streak is about to break
 *
 * Requires an authenticated session. Returns 401 if not logged in.
 * Uses `private` caching to prevent CDN from leaking data across users.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      );
    }

    // Find the user's agent
    const { data: agent } = await supabase
      .from("agent_state")
      .select("agent_id")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json(
        { reward_expiry: null, duo_streak_risk: null },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    const [expiry, risk] = await Promise.allSettled([
      getRewardExpiryStatus(agent.agent_id),
      checkDuoStreakRisk(agent.agent_id),
    ]);

    return NextResponse.json(
      {
        reward_expiry: expiry.status === "fulfilled" ? expiry.value : null,
        duo_streak_risk: risk.status === "fulfilled" ? risk.value : null,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (err) {
    logWarn("retention-status: fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { reward_expiry: null, duo_streak_risk: null },
      { status: 500 },
    );
  }
}
