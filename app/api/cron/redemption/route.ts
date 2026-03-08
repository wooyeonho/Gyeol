import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";

/**
 * Redemption fulfillment (stub for PG).
 * Processes pending redemption requests. In production, would call payment gateway.
 * For now: marks as approved. Real PG integration would transfer KRW to user.
 */
export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return runRedemption();
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return runRedemption();
}

async function runRedemption() {
  try {
    const service = createServiceClient();
    const { data: pending } = await service
      .from("redemption_requests")
      .select("id, user_id, agent_id, coins_amount, krw_requested")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (!pending?.length) {
      return new Response(
        JSON.stringify({ processed: 0, timestamp: new Date().toISOString() }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let fulfilled = 0;
    for (const req of pending) {
      try {
        // Stub: mark as approved. Real PG would: call payment API, then update status.
        await service
          .from("redemption_requests")
          .update({ status: "approved" })
          .eq("id", req.id);
        fulfilled++;
      } catch (e) {
        console.error("redemption fulfill", req.id, e);
      }
    }

    return new Response(
      JSON.stringify({ processed: fulfilled, timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("redemption cron", e);
    return new Response(
      JSON.stringify({ error: "Redemption processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
