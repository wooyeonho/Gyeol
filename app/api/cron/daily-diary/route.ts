export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { maybeWriteDailyDiary } from "@/lib/diary/auto-generate";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "cron/daily-diary" });

/**
 * Phase 2-1: Daily diary generation cron.
 *
 * Iterates through agents that were active in the last 48h and ensures
 * each has a diary entry for today. Runs are idempotent (the helper
 * short-circuits if a diary already exists for today) so this endpoint
 * can be scheduled hourly without risking duplicates.
 */
export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const DEADLINE_MS = 90_000;
  const db = createServiceClient();

  // Pull agents that have had *some* activity in the last 48h — avoids
  // wasting tokens writing diaries for dormant creatures.
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: activeStates, error } = await db
    .from("agent_state")
    .select("agent_id, last_heartbeat_at")
    .gte("last_heartbeat_at", twoDaysAgo)
    .order("last_heartbeat_at", { ascending: false })
    .limit(500);

  if (error) {
    log.error("agent_state query failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let generated = 0;
  let skipped = 0;
  let errored = 0;

  for (const row of activeStates ?? []) {
    if (Date.now() - started > DEADLINE_MS) break;
    try {
      const id = await maybeWriteDailyDiary(row.agent_id as string);
      if (id) generated += 1;
      else skipped += 1;
    } catch (err) {
      errored += 1;
      log.warn("diary generation failed", {
        agentId: row.agent_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    processed: (activeStates ?? []).length,
    generated,
    skipped,
    errored,
    durationMs: Date.now() - started,
  });
}

export const POST = GET;
