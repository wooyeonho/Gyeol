import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

/**
 * Cron: Resolve expired war events. Run hourly to close events past ends_at.
 */
export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const lockKey = "cron:war";
  const acquired = await acquireCronLock(lockKey, 120);
  if (!acquired) {
    return new Response(
      JSON.stringify({ processed: 0, skipped: "lock", timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const db = createServiceClient();
    const now = new Date().toISOString();

    const { data: expired } = await db
      .from("war_events")
      .select("id")
      .eq("status", "active")
      .lt("ends_at", now);

    let resolved = 0;
    for (const ev of expired ?? []) {
      const { error } = await db
        .from("war_events")
        .update({ status: "resolved" })
        .eq("id", ev.id);
      if (!error) resolved++;
      else console.error("war resolve", ev.id, error);
    }

    return new Response(
      JSON.stringify({ processed: resolved, resolved, timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("war cron", e);
    return new Response(
      JSON.stringify({ error: "War processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await releaseCronLock(lockKey);
  }
}
