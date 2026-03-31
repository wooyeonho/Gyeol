/**
 * Reward Expiry Countdown — Feature 4 (Group A Retention)
 *
 * Creates urgency by showing a countdown timer when unclaimed rewards
 * are about to expire. Expected impact: +10% DAU.
 *
 * Expiry window: 24 hours from last guaranteed reward trigger.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

/** Hours before a guaranteed reward slot expires */
const EXPIRY_WINDOW_HOURS = 24;

export type RewardExpiryStatus = {
  /** Hours remaining until reward expires (0 = expired) */
  expiresInHours: number;
  /** Minutes remaining (for sub-hour precision) */
  expiresInMinutes: number;
  /** Current streak multiplier that would be lost */
  multiplier: number;
  /** Urgency level for UI styling */
  urgency: "low" | "medium" | "high" | "critical";
};

/**
 * Derive urgency level from remaining hours.
 * - critical: < 2 hours
 * - high: < 6 hours
 * - medium: < 12 hours
 * - low: >= 12 hours
 */
function deriveUrgency(hoursLeft: number): RewardExpiryStatus["urgency"] {
  if (hoursLeft < 2) return "critical";
  if (hoursLeft < 6) return "high";
  if (hoursLeft < 12) return "medium";
  return "low";
}

/**
 * Check if the user has an expiring reward window.
 * Returns null if no reward is at risk of expiring.
 */
export async function getRewardExpiryStatus(
  agentId: string,
): Promise<RewardExpiryStatus | null> {
  const db = createServiceClient();

  try {
    // Get the agent's last reward event and streak info
    const { data: state } = await db
      .from("agent_state")
      .select("config, streak_days, last_message_at")
      .eq("agent_id", agentId)
      .single();

    if (!state) return null;

    const config = (state.config ?? {}) as Record<string, unknown>;
    const lastRewardAt = config.last_reward_at as string | undefined;
    const streakDays = typeof state.streak_days === "number" ? state.streak_days : 0;

    // No active reward window if no previous reward
    if (!lastRewardAt) return null;

    const rewardTime = new Date(lastRewardAt).getTime();
    const expiryTime = rewardTime + EXPIRY_WINDOW_HOURS * 3600_000;
    const now = Date.now();

    // Already expired — no point showing countdown
    if (now >= expiryTime) return null;

    const msRemaining = expiryTime - now;
    const hoursRemaining = msRemaining / 3600_000;
    const minutesRemaining = msRemaining / 60_000;

    // Only show if within actionable window (< 18 hours remaining)
    if (hoursRemaining > 18) return null;

    // Streak multiplier: 1x base + 0.1x per streak day, capped at 3x
    const multiplier = Math.min(3, 1 + streakDays * 0.1);

    return {
      expiresInHours: Math.floor(hoursRemaining),
      expiresInMinutes: Math.floor(minutesRemaining),
      multiplier: Math.round(multiplier * 10) / 10,
      urgency: deriveUrgency(hoursRemaining),
    };
  } catch (error) {
    logWarn("getRewardExpiryStatus failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
