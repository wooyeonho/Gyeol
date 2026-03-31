/**
 * Real-time active user counter.
 *
 * Tracks approximate count of currently active users by checking
 * recent chat activity within a rolling window. This creates
 * social proof ("142 people are caring for their creatures right now")
 * which is a proven retention driver.
 *
 * The counter is intentionally approximate — we add a small random
 * jitter so the number feels "alive" and never shows exact zeros.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

/** Rolling window: users who chatted within this many minutes are "active". */
const ACTIVE_WINDOW_MINUTES = 15;

/** Minimum floor so the counter never shows embarrassingly low numbers. */
const MIN_DISPLAY_COUNT = 3;

/** Maximum jitter added to the raw count for organic feel. */
const MAX_JITTER = 5;

/**
 * Query the DB for approximately how many unique users have sent
 * a message in the last ACTIVE_WINDOW_MINUTES.
 */
export async function getActiveUserCount(): Promise<number> {
  const db = createServiceClient();

  try {
    const windowStart = new Date(
      Date.now() - ACTIVE_WINDOW_MINUTES * 60_000,
    ).toISOString();

    // Fetch agent_ids with user messages in the window.
    // Use an explicit large limit to avoid Supabase's default 1000-row cap
    // silently truncating the result set.
    const { data, error } = await db
      .from("chats")
      .select("agent_id")
      .eq("role", "user")
      .gte("created_at", windowStart)
      .limit(10_000);

    if (error) {
      logWarn("getActiveUserCount query failed", { error: error.message });
      return MIN_DISPLAY_COUNT;
    }

    // Count unique agent_ids from the result set
    const uniqueAgents = new Set(
      ((data ?? []) as Array<{ agent_id: string }>).map((row) => row.agent_id),
    );
    const estimatedUsers = uniqueAgents.size;

    // Add small jitter for organic feel
    const jitter = Math.floor(Math.random() * MAX_JITTER);
    return Math.max(MIN_DISPLAY_COUNT, estimatedUsers + jitter);
  } catch (error) {
    logWarn("getActiveUserCount failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return MIN_DISPLAY_COUNT;
  }
}
