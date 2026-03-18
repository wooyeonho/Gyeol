import { createServiceClient } from "@/lib/supabase/service";

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
    console.error("[MoltBook] Share: entry not found", fetchErr?.message);
    return false;
  }

  if ((entry.confidence as number) < 0.6) {
    console.log("[MoltBook] Share: confidence too low", entry.confidence);
    return false;
  }

  const { error: updateErr } = await db
    .from("moltbook_entries")
    .update({
      is_public: true,
      times_shared: ((entry.times_shared as number) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (updateErr) {
    console.error("[MoltBook] Share update error:", updateErr.message);
    return false;
  }

  // Log the sharing action
  await db.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "moltbook_share",
    summary: `Shared entry "${entryId}" publicly`,
  }).then(() => {});

  console.log(`[MoltBook] Entry ${entryId} shared publicly by agent ${agentId}`);
  return true;
}
