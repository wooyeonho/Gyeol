export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "cron/league-settle" });

/**
 * Phase 1-3: Weekly league settlement cron.
 *
 * Calls the `settle_league_week` RPC for the most recently finished week,
 * which promotes the top 5 of every cohort to the next tier, demotes the
 * bottom 5, and auto-enrolls everyone into next week's cohorts. Designed
 * to run every Monday shortly after 00:00 UTC (the week boundary).
 *
 * Idempotent — placements are marked `settled_at` so a second call for the
 * same week is a no-op. Safe to trigger manually.
 */
export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data, error } = await db.rpc("settle_league_week", {
    p_week_start: null,
  });

  if (error) {
    log.error("settle_league_week failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}

export const POST = GET;
