import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

export async function GET() {
  try {
    const db = createServiceClient();
    const { data: event } = await db
      .from("war_events")
      .select("id, side_a, side_b, side_a_score, side_b_score, ends_at, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json(event ?? null);
  } catch (e) {
    console.error("war GET", e);
    return NextResponse.json(null);
  }
}

/**
 * Cron: Resolve expired war events. Run periodically (e.g. hourly) to close events past ends_at.
 */
export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:war";
  const acquired = await acquireCronLock(lockKey, 120);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const now = new Date().toISOString();

    // 1. Resolve expired active events
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

    return NextResponse.json({ processed: resolved, resolved });
  } catch (e) {
    console.error("war POST", e);
    return NextResponse.json({ error: "War processing failed" }, { status: 500 });
  } finally {
    await releaseCronLock(lockKey);
  }
}
