import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";

/**
 * Absorb a shared MoltBook entry from MoltHub into the agent's own MoltBook.
 * Confidence degrades by 0.1 (min 0.3) when knowledge transfers between agents.
 */
export async function absorbSharedKnowledge(
  agentId: string,
  entryId: string
): Promise<boolean> {
  const db = createServiceClient();

  // Get the public entry
  const { data: entry, error: fetchErr } = await db
    .from("moltbook_entries")
    .select("id, agent_id, topic, summary, source_type, confidence, tags, embedding, times_referenced")
    .eq("id", entryId)
    .eq("is_public", true)
    .single();

  if (fetchErr || !entry) {
    console.error("[MoltHub] Absorb: entry not found or not public", fetchErr?.message);
    return false;
  }

  // Cannot absorb own entry
  if (entry.agent_id === agentId) {
    console.log("[MoltHub] Absorb: cannot absorb own entry");
    return false;
  }

  // Check if already starred (absorbed)
  const { data: existingStar } = await db
    .from("molthub_stars")
    .select("id")
    .eq("entry_id", entryId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (existingStar) {
    console.log("[MoltHub] Absorb: already absorbed this entry");
    return false;
  }

  // Generate fresh embedding for the absorbed entry
  const embedding = await generateEmbedding(
    `${String(entry.topic)}: ${String(entry.summary)}`
  );

  // Create own copy with degraded confidence
  const degradedConfidence = Math.max(0.3, (entry.confidence as number) - 0.1);
  const { error: insertErr } = await db.from("moltbook_entries").insert({
    agent_id: agentId,
    topic: entry.topic,
    summary: entry.summary,
    source_type: "shared",
    source_agent_id: entry.agent_id,
    confidence: degradedConfidence,
    tags: entry.tags ?? [],
    embedding: embedding.length > 0 ? embedding : null,
    is_public: false,
  });

  if (insertErr) {
    console.error("[MoltHub] Absorb insert error:", insertErr.message);
    return false;
  }

  // Create star record AFTER entry copy succeeds to avoid dangling stars blocking retries
  const { error: starErr } = await db.from("molthub_stars").insert({
    entry_id: entryId,
    agent_id: agentId,
  });

  if (starErr) {
    console.error("[MoltHub] Star insert error:", starErr.message);
    // Entry was already copied — star failure is non-fatal, retry will dedup via star check
  }

  // Increment original's times_referenced
  await db
    .from("moltbook_entries")
    .update({ times_referenced: (Number(entry.times_referenced) || 0) + 1 })
    .eq("id", entryId)
    .then(() => {});

  console.log(`[MoltHub] Agent ${agentId} absorbed entry ${entryId} (confidence: ${degradedConfidence})`);
  return true;
}
