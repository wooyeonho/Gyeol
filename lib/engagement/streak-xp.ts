/**
 * Streak + XP engine — the Phase 1 retention core.
 *
 * Wraps the `record_activity_atomic` RPC so any server-side action can
 * advance the user's streak and award XP in a single, race-safe call.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const log = logger.child({ mod: "engagement/streak-xp" });

export type ActivityReason =
  | "care:feed"
  | "care:rest"
  | "chat:message"
  | "daily:login"
  | "quest:complete"
  | "social:post"
  | "social:react"
  | "dna:edit"
  | "discover:visit"
  | "misc";

export const XP_REWARDS: Record<ActivityReason, number> = {
  "care:feed": 5,
  "care:rest": 5,
  "chat:message": 10,
  "daily:login": 3,
  "quest:complete": 20,
  "social:post": 8,
  "social:react": 2,
  "dna:edit": 6,
  "discover:visit": 1,
  misc: 1,
};

export interface ActivityResult {
  currentStreak: number;
  longestStreak: number;
  shieldUsed: boolean;
  streakBroken: boolean;
  streakMilestone: boolean;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  leveledUp: boolean;
  prevLevel: number;
  xpAwarded: number;
}

interface RawResult {
  current_streak: number;
  longest_streak: number;
  shield_used: boolean;
  streak_broken: boolean;
  streak_milestone: boolean;
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next: number;
  leveled_up: boolean;
  prev_level: number;
  xp_awarded: number;
}

function mapResult(row: RawResult): ActivityResult {
  return {
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    shieldUsed: Boolean(row.shield_used),
    streakBroken: Boolean(row.streak_broken),
    streakMilestone: Boolean(row.streak_milestone),
    totalXp: Number(row.total_xp ?? 0),
    level: row.level ?? 1,
    xpIntoLevel: row.xp_into_level ?? 0,
    xpForNext: row.xp_for_next ?? 100,
    leveledUp: Boolean(row.leveled_up),
    prevLevel: row.prev_level ?? 1,
    xpAwarded: row.xp_awarded ?? 0,
  };
}

/**
 * Record a user activity: advances daily streak + awards XP atomically.
 * Returns null on failure (non-fatal — caller should continue).
 */
export async function recordActivity(
  userId: string,
  reason: ActivityReason,
  xpOverride?: number,
): Promise<ActivityResult | null> {
  const amount = xpOverride ?? XP_REWARDS[reason] ?? XP_REWARDS.misc;
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("record_activity_atomic", {
      p_user_id: userId,
      p_xp_amount: amount,
      p_reason: reason,
    });
    if (error) {
      log.warn("record_activity_atomic failed", { error: error.message, reason });
      return null;
    }
    if (!data) return null;
    return mapResult(data as RawResult);
  } catch (e) {
    log.warn("record_activity_atomic threw", {
      detail: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/** Read current streak + XP state for a user. */
export async function getEngagementState(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  shieldCount: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
}> {
  const db = createServiceClient();
  const [streakRes, xpRes] = await Promise.all([
    db
      .from("user_streaks")
      .select("current_streak, longest_streak, last_activity_date, shield_count")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("user_xp")
      .select("total_xp, current_level, xp_into_level")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const streak = (streakRes.data ?? null) as {
    current_streak?: number;
    longest_streak?: number;
    last_activity_date?: string | null;
    shield_count?: number;
  } | null;
  const xp = (xpRes.data ?? null) as {
    total_xp?: number;
    current_level?: number;
    xp_into_level?: number;
  } | null;

  const level = xp?.current_level ?? 1;
  const xpForNext = 100 * level;
  return {
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    lastActivityDate: streak?.last_activity_date ?? null,
    shieldCount: streak?.shield_count ?? 0,
    totalXp: Number(xp?.total_xp ?? 0),
    level,
    xpIntoLevel: xp?.xp_into_level ?? 0,
    xpForNext,
  };
}

/** Auto-enroll the user into the current week's bronze league cohort. */
export async function ensureLeagueEnrollment(userId: string): Promise<string | null> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("enroll_in_current_league", {
      p_user_id: userId,
      p_tier: "bronze",
    });
    if (error) {
      log.warn("enroll_in_current_league failed", { error: error.message });
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    log.warn("enroll_in_current_league threw", {
      detail: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
