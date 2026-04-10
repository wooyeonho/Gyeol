import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Share a MoltBook entry publicly on MoltHub.
 * Only shares entries with confidence >= 0.6.
 */
export async function shareMoltBookEntry(
  agentId: string,
  entryId: string
): Promise<boolean> {
  const db = createServiceClient();

  const { data: entry, error: fetchErr } = await db
    .from("moltbook_entries")
    .select("id, agent_id, confidence, times_shared")
    .eq("id", entryId)
    .eq("agent_id", agentId)
    .single();

  if (fetchErr || !entry) {
    logger.error("[MoltBook] Share: entry not found", { error: fetchErr?.message });
    return false;
  }

  if (Number(entry.confidence ?? 0) < 0.6) {
    logger.warn("[MoltBook] Share: confidence too low", { confidence: entry.confidence });
    return false;
  }

  const { error: updateErr } = await db
    .from("moltbook_entries")
    .update({
      is_public: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (updateErr) {
    logger.error("[MoltBook] Share update error", { error: updateErr.message });
    return false;
  }

  // Atomic increment of times_shared to avoid race conditions
  await db.rpc("increment_moltbook_counter", {
    p_entry_id: entryId,
    p_column: "times_shared",
  }).then(() => {});

  // Log the sharing action
  await db.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "moltbook_share",
    summary: `Shared entry "${entryId}" publicly`,
  }).then(() => {});

  // Debug log removed — autonomous_logs table records this action
  return true;
}
