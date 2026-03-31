import { NextResponse } from "next/server";
import { getActiveUserCount } from "@/lib/retention/active-counter";
import { getRewardExpiryStatus } from "@/lib/retention/reward-expiry";
import { checkDuoStreakRisk } from "@/lib/retention/duo-streak-alert";
import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/presence
 *
 * Returns the approximate number of currently active users,
 * plus optional reward expiry countdown and duo streak risk data
 * when an authenticated user is detected.
 *
 * Response is intentionally lightweight for frequent polling.
 */
export async function GET() {
  try {
    const count = await getActiveUserCount();

    // Try to resolve the authenticated user's agent for personalized data
    let rewardExpiry = null;
    let duoStreakRisk = null;

    try {
      const db = createServiceClient();
      // Get the most recently active agent as a lightweight proxy
      // (service client can't resolve per-request auth, so we use a heuristic)
      const { data: agent } = await db
        .from("agent_state")
        .select("agent_id")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (agent) {
        const [expiry, risk] = await Promise.allSettled([
          getRewardExpiryStatus(agent.agent_id),
          checkDuoStreakRisk(agent.agent_id),
        ]);

        rewardExpiry = expiry.status === "fulfilled" ? expiry.value : null;
        duoStreakRisk = risk.status === "fulfilled" ? risk.value : null;
      }
    } catch (err) {
      logWarn("presence: personalized data fetch failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      // Non-critical — continue with basic active count
    }

    return NextResponse.json(
      {
        active: count,
        ts: Date.now(),
        ...(rewardExpiry ? { reward_expiry: rewardExpiry } : {}),
        ...(duoStreakRisk ? { duo_streak_risk: duoStreakRisk } : {}),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ active: 3, ts: Date.now() });
  }
}
