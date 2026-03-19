import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { buildMigrationGenome } from "@/lib/genome/migrate";
import { safeHandler } from "@/lib/api/safe-handler";

/**
 * POST /api/genome/migrate
 *
 * Migrates all existing agents that lack a genome.
 * For each agent without genome data, reverse-engineers DNA from
 * their accumulated state and stores the result.
 *
 * Idempotent: agents that already have a genome are skipped.
 * Returns the count of migrated agents.
 */
export const POST = safeHandler(async () => {
  const service = createServiceClient();

  // Find agents missing genome data
  const { data: states } = await service
    .from("agent_state")
    .select("agent_id, total_messages, intimacy_score, mood, config, self_model, visual, personality, vitality, genome")
    .order("agent_id");

  if (!states || states.length === 0) {
    return NextResponse.json({ migrated: 0, message: "No agents found" });
  }

  type StateRow = {
    agent_id: string;
    total_messages?: number;
    intimacy_score?: number;
    mood?: string | null;
    config?: Record<string, unknown> | null;
    self_model?: Record<string, unknown> | null;
    visual?: Record<string, unknown> | null;
    personality?: Record<string, unknown> | null;
    vitality?: number | null;
    genome?: { dna?: unknown } | null;
  };

  const needsMigration = (states as StateRow[]).filter((s) => !s.genome?.dna);

  if (needsMigration.length === 0) {
    return NextResponse.json({ migrated: 0, message: "All agents already have genomes" });
  }

  let migrated = 0;
  const errors: string[] = [];

  for (const state of needsMigration) {
    try {
      const genome = buildMigrationGenome({
        agent_id: state.agent_id,
        total_messages: state.total_messages,
        intimacy_score: state.intimacy_score,
        mood: state.mood,
        config: state.config as Parameters<typeof buildMigrationGenome>[0]["config"],
        self_model: state.self_model as Parameters<typeof buildMigrationGenome>[0]["self_model"],
        visual: state.visual as Parameters<typeof buildMigrationGenome>[0]["visual"],
        personality: state.personality as Parameters<typeof buildMigrationGenome>[0]["personality"],
        vitality: state.vitality,
      });

      const { error } = await service
        .from("agent_state")
        .update({ genome })
        .eq("agent_id", state.agent_id);

      if (error) {
        errors.push(`${state.agent_id}: ${error.message}`);
      } else {
        migrated++;
      }
    } catch (err) {
      errors.push(`${state.agent_id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({
    migrated,
    total: needsMigration.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}, {
  label: "POST /api/genome/migrate",
});
