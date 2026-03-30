/**
 * Absence-driven evolution — Retention FOMO system.
 *
 * When a user is away for extended periods (>24h), the creature undergoes
 * subtle autonomous changes: mood drift, independence growth, and
 * accumulated "missed events" that create a "what did I miss?" feeling
 * when the user returns.
 *
 * Thresholds:
 *  - 24h+: mild drift (independence +0.01, playfulness -0.005)
 *  - 48h+: moderate drift (adds curiosity +0.008, stability +0.006)
 *  - 72h+: strong drift (adds adaptability +0.01, warmth -0.008)
 *
 * Each heartbeat cycle during absence accumulates at most one "missed event"
 * stored in agent_state.config.absence_events (max 5, FIFO).
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { CreatureDNA, DNAAxis } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { logWarn } from "@/lib/ops/logger";

/** Maximum missed-event entries kept per creature. */
const MAX_ABSENCE_EVENTS = 5;

/** Absence drift profiles keyed by threshold (hours). */
const ABSENCE_DRIFT: { minHours: number; nudges: Partial<Record<DNAAxis, number>> }[] = [
  { minHours: 24, nudges: { independence: 0.01, playfulness: -0.005 } },
  { minHours: 48, nudges: { curiosity: 0.008, stability: 0.006 } },
  { minHours: 72, nudges: { adaptability: 0.01, warmth: -0.008 } },
];

/** Possible autonomous events the creature can "experience" while alone. */
const SOLO_EVENT_TEMPLATES = [
  "explored_new_thought",
  "watched_weather_change",
  "practiced_new_skill",
  "had_vivid_dream",
  "discovered_pattern",
  "felt_sudden_emotion",
  "rearranged_memories",
  "hummed_unknown_melody",
] as const;

type AbsenceEvent = {
  type: (typeof SOLO_EVENT_TEMPLATES)[number];
  timestamp: string;
  hoursAlone: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Apply absence-driven DNA drift. Returns nudged DNA and list of changed axes.
 * Does NOT modify the original object.
 */
export function applyAbsenceDrift(
  currentDNA: CreatureDNA,
  hoursAbsent: number,
): { dna: CreatureDNA; changedAxes: DNAAxis[] } {
  const next = { ...currentDNA };
  const changed = new Set<DNAAxis>();

  for (const tier of ABSENCE_DRIFT) {
    if (hoursAbsent < tier.minHours) continue;
    for (const [axis, nudge] of Object.entries(tier.nudges) as [DNAAxis, number][]) {
      const current = next[axis];
      const headroom = nudge > 0 ? 1 - current : current;
      const effective = nudge * headroom;
      next[axis] = clamp(current + effective, 0, 1);
      if (Math.abs(effective) > 0.001) changed.add(axis);
    }
  }

  return { dna: next, changedAxes: [...changed] };
}

/**
 * Pick a deterministic solo event based on the current timestamp + agentId.
 */
function pickSoloEvent(agentId: string, hoursAbsent: number): AbsenceEvent {
  let hash = 0;
  const seed = `${agentId}:${Math.floor(Date.now() / 3600000)}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % SOLO_EVENT_TEMPLATES.length;
  return {
    type: SOLO_EVENT_TEMPLATES[idx],
    timestamp: new Date().toISOString(),
    hoursAlone: Math.round(hoursAbsent),
  };
}

/**
 * Main heartbeat step: process absence-driven evolution for one agent.
 *
 * Called from heartbeat.ts via `runOptionalStep`.
 * - Applies DNA drift based on absence duration
 * - Accumulates a "missed event" in config.absence_events
 * - Logs the drift to autonomous_logs
 */
export async function processAbsenceDrift(agentId: string, hoursAbsent: number): Promise<void> {
  if (hoursAbsent < 24) return; // No drift under 24h

  const db = createServiceClient();

  try {
    const { data: state } = await db
      .from("agent_state")
      .select("config, genome")
      .eq("agent_id", agentId)
      .single();
    if (!state) return;

    const config = (state.config ?? {}) as Record<string, unknown>;

    // Guard: only drift once per 6-hour window to avoid excessive mutation
    const lastDriftAt = typeof config.absence_last_drift_at === "string"
      ? new Date(config.absence_last_drift_at).getTime()
      : 0;
    if (Date.now() - lastDriftAt < 6 * 3600000) return;

    // --- DNA drift ---
    const genome = (state.genome ?? {}) as { dna?: CreatureDNA };
    const currentDNA = genome.dna;
    let dnaUpdate: Record<string, unknown> | null = null;

    if (currentDNA && DNA_AXES.every((a) => typeof currentDNA[a] === "number")) {
      const { dna: driftedDNA, changedAxes } = applyAbsenceDrift(currentDNA, hoursAbsent);
      if (changedAxes.length > 0) {
        const species = deriveSpecies(driftedDNA);
        dnaUpdate = { ...genome, dna: driftedDNA, species: species.name, archetype: species.archetype, element: species.element };
        await db.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "absence_drift",
          summary: `DNA drifted during ${Math.round(hoursAbsent)}h absence: ${changedAxes.join(", ")}`,
        });
      }
    }

    // --- Missed event accumulation ---
    const existingEvents = Array.isArray(config.absence_events)
      ? (config.absence_events as AbsenceEvent[])
      : [];
    const newEvent = pickSoloEvent(agentId, hoursAbsent);
    const updatedEvents = [...existingEvents, newEvent].slice(-MAX_ABSENCE_EVENTS);

    // --- Persist ---
    const updatePayload: Record<string, unknown> = {
      config: {
        ...config,
        absence_events: updatedEvents,
        absence_last_drift_at: new Date().toISOString(),
        absence_hours_peak: Math.max(
          typeof config.absence_hours_peak === "number" ? config.absence_hours_peak : 0,
          hoursAbsent,
        ),
      },
    };
    if (dnaUpdate) {
      updatePayload.genome = dnaUpdate;
    }

    await db.from("agent_state").update(updatePayload).eq("agent_id", agentId);
  } catch (error) {
    logWarn("processAbsenceDrift failed", {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clear absence events after the user returns (called on first user message
 * after an absence period). Returns the events that were cleared so the
 * frontend can show a "welcome back" summary.
 */
export async function consumeAbsenceEvents(agentId: string): Promise<AbsenceEvent[]> {
  const db = createServiceClient();
  const { data: state } = await db
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();
  if (!state) return [];

  const config = (state.config ?? {}) as Record<string, unknown>;
  const events = Array.isArray(config.absence_events)
    ? (config.absence_events as AbsenceEvent[])
    : [];

  if (events.length === 0) return [];

  // Clear events + record peak absence for personality context
  await db.from("agent_state").update({
    config: {
      ...config,
      absence_events: [],
      absence_last_return_at: new Date().toISOString(),
    },
  }).eq("agent_id", agentId);

  return events;
}
