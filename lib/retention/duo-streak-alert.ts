/**
 * Duo Streak Risk Alert — Feature 5 (Group A Retention)
 *
 * Alerts users when their shared streak with a friend is at risk
 * of breaking. Expected impact: +25% retention for paired users.
 *
 * Risk threshold: >18 hours without either party messaging (out of 24h daily window).
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

/** Hours of inactivity before streak is considered at risk */
const RISK_THRESHOLD_HOURS = 18;

/** Hours in a streak day window */
const STREAK_WINDOW_HOURS = 24;

export type DuoStreakRisk = {
  /** Risk severity */
  riskLevel: "medium" | "high";
  /** Hours remaining before streak breaks */
  hoursUntilLoss: number;
  /** Friend's creature name */
  friendName: string;
  /** Friend's agent ID (for deep-linking) */
  friendAgentId: string;
  /** Current shared streak length in days */
  streakDays: number;
};

/**
 * Check if the user's duo streak with any friend is at risk.
 * Returns the highest-risk friendship, or null if no risk.
 */
export async function checkDuoStreakRisk(
  agentId: string,
): Promise<DuoStreakRisk | null> {
  const db = createServiceClient();

  try {
    // Find active friendships for this agent
    const { data: friendships } = await db
      .from("friendships")
      .select("id, agent_a, agent_b, streak_days, last_interaction_at")
      .or(`agent_a.eq.${agentId},agent_b.eq.${agentId}`)
      .gt("streak_days", 0)
      .order("streak_days", { ascending: false })
      .limit(5);

    if (!friendships || friendships.length === 0) return null;

    const now = Date.now();
    let highestRisk: DuoStreakRisk | null = null;

    for (const f of friendships) {
      const lastInteraction = f.last_interaction_at
        ? new Date(f.last_interaction_at as string).getTime()
        : 0;

      if (lastInteraction === 0) continue;

      const hoursSinceInteraction = (now - lastInteraction) / 3600_000;
      const hoursUntilLoss = STREAK_WINDOW_HOURS - hoursSinceInteraction;

      // Only alert if past the risk threshold but not yet broken
      if (hoursSinceInteraction < RISK_THRESHOLD_HOURS || hoursUntilLoss <= 0) {
        continue;
      }

      const friendAgentId = f.agent_a === agentId
        ? (f.agent_b as string)
        : (f.agent_a as string);

      // Get friend's name
      const { data: friendState } = await db
        .from("agent_state")
        .select("self_name")
        .eq("agent_id", friendAgentId)
        .single();

      const friendName = typeof friendState?.self_name === "string" && friendState.self_name
        ? friendState.self_name
        : "???";

      const streakDays = typeof f.streak_days === "number" ? f.streak_days : 0;
      const riskLevel: DuoStreakRisk["riskLevel"] = hoursUntilLoss < 3 ? "high" : "medium";

      // Keep the highest-risk (shortest time until loss)
      if (!highestRisk || hoursUntilLoss < highestRisk.hoursUntilLoss) {
        highestRisk = {
          riskLevel,
          hoursUntilLoss: Math.round(hoursUntilLoss * 10) / 10,
          friendName,
          friendAgentId,
          streakDays,
        };
      }
    }

    return highestRisk;
  } catch (error) {
    logWarn("checkDuoStreakRisk failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
