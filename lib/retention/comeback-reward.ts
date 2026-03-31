/**
 * Comeback reward multiplier system.
 *
 * When a user returns after an extended absence, they receive a boosted
 * reward multiplier on their first interaction:
 *
 *   3-6 days absent  → 2x multiplier
 *   7-13 days absent → 3x multiplier
 *   14+ days absent  → 5x multiplier
 *
 * The multiplier applies to the standard variable-reward coin/evolution
 * drops and is consumed after the first message reward roll.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

// ---------------------------------------------------------------------------
// Multiplier tiers (ordered descending so the first match wins)
// ---------------------------------------------------------------------------

type ComebackTier = {
  minAbsentDays: number;
  multiplier: number;
  labelKo: string;
  labelEn: string;
};

const COMEBACK_TIERS: ComebackTier[] = [
  { minAbsentDays: 14, multiplier: 5, labelKo: "대왕 복귀 보너스 5x", labelEn: "Mega comeback bonus 5x" },
  { minAbsentDays: 7, multiplier: 3, labelKo: "복귀 보너스 3x", labelEn: "Comeback bonus 3x" },
  { minAbsentDays: 3, multiplier: 2, labelKo: "반가워요 2x", labelEn: "Welcome back 2x" },
];

// ---------------------------------------------------------------------------
// Pure helpers (no DB access — safe for client or server)
// ---------------------------------------------------------------------------

/**
 * Determine the comeback multiplier for a given absence duration.
 * Returns 1 (no bonus) when the user hasn't been away long enough.
 */
export function getComebackMultiplier(absentHours: number): number {
  const days = absentHours / 24;
  for (const tier of COMEBACK_TIERS) {
    if (days >= tier.minAbsentDays) return tier.multiplier;
  }
  return 1;
}

/**
 * Get the full tier info (multiplier + label) for display purposes.
 */
export function getComebackTier(absentHours: number): ComebackTier | null {
  const days = absentHours / 24;
  for (const tier of COMEBACK_TIERS) {
    if (days >= tier.minAbsentDays) return tier;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server-side helpers (DB access)
// ---------------------------------------------------------------------------

/**
 * Check whether the agent has an active comeback bonus waiting.
 * Returns the multiplier (1 = no bonus).
 */
export async function checkComebackBonus(agentId: string): Promise<{
  multiplier: number;
  absentHours: number;
  labelKo: string;
  labelEn: string;
} | null> {
  const db = createServiceClient();

  try {
    const { data: state } = await db
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();
    if (!state) return null;

    const config = (state.config ?? {}) as Record<string, unknown>;
    const absenceHoursPeak = typeof config.absence_hours_peak === "number"
      ? config.absence_hours_peak
      : 0;
    const comebackClaimed = config.comeback_claimed === true;

    if (comebackClaimed || absenceHoursPeak < 72) return null; // 3 days minimum

    const tier = getComebackTier(absenceHoursPeak);
    if (!tier) return null;

    return {
      multiplier: tier.multiplier,
      absentHours: absenceHoursPeak,
      labelKo: tier.labelKo,
      labelEn: tier.labelEn,
    };
  } catch (error) {
    logWarn("checkComebackBonus failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Mark the comeback bonus as claimed so it only fires once per return.
 */
export async function claimComebackBonus(agentId: string): Promise<void> {
  const db = createServiceClient();

  try {
    const { data: state } = await db
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();
    if (!state) return;

    const config = (state.config ?? {}) as Record<string, unknown>;
    await db.from("agent_state").update({
      config: {
        ...config,
        comeback_claimed: true,
        comeback_claimed_at: new Date().toISOString(),
        absence_hours_peak: 0,
      },
    }).eq("agent_id", agentId);

    await db.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "comeback_bonus_claimed",
      summary: `Comeback bonus claimed after ${Math.round(Number(config.absence_hours_peak ?? 0))}h absence`,
    });
  } catch (error) {
    logWarn("claimComebackBonus failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Reset the comeback_claimed flag when the user goes absent again.
 * Called from processAbsenceDrift when absence >= 72h.
 */
export async function resetComebackFlag(agentId: string): Promise<void> {
  const db = createServiceClient();

  try {
    const { data: state } = await db
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();
    if (!state) return;

    const config = (state.config ?? {}) as Record<string, unknown>;
    if (config.comeback_claimed !== true) return; // already reset

    await db.from("agent_state").update({
      config: {
        ...config,
        comeback_claimed: false,
      },
    }).eq("agent_id", agentId);
  } catch (error) {
    logWarn("resetComebackFlag failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
