import { createServiceClient } from "@/lib/supabase/service";

/**
 * Exponential Decay Constants
 *
 * Every memory starts with weight = 1.0 and decays over time.
 *
 *   w(t) = exp(−λ · t)
 *
 * where:
 *   t  = days elapsed since memory was created
 *   λ  = effective decay rate (slows as reference_count grows)
 *
 * Effective rate formula:
 *   λ = BASE_DECAY_RATE / (1 + reference_count × REF_SLOWDOWN)
 *
 * Intuition:
 *   - A memory never referenced (ref=0): λ = 0.05/day
 *     → 50% weight at day 14, archived (~<10%) around day 46.
 *   - Referenced 5× (ref=5): λ = 0.05/2.5 = 0.02/day
 *     → archived around day 115.
 *   - Referenced 20× (ref=20): λ = 0.05/7 ≈ 0.007/day
 *     → archived around day 330.
 *   - Referenced 50× (ref=50): λ ≈ 0.003/day → ~900 days (near-permanent).
 *
 * Weight is always recomputed from creation date — deterministic and idempotent.
 */
const BASE_DECAY_RATE = 0.05;  // λ₀ — base daily decay for unreferenced memory
const REF_SLOWDOWN    = 0.3;   // each reference reduces decay rate by 30%
const ARCHIVE_THRESHOLD = 0.10; // archive (not delete) when weight drops below 10%
const BATCH_SIZE      = 50;    // max memories per agent processed per cycle

type MemoryRow = {
  id: string;
  created_at: string;
  reference_count: number | null;
  weight: number | null;
  archived: boolean | null;
};

/**
 * Compute the effective decay rate for a memory.
 * Higher reference_count → slower decay → longer-lived memory.
 */
function effectiveDecayRate(referenceCount: number): number {
  return BASE_DECAY_RATE / (1 + referenceCount * REF_SLOWDOWN);
}

/**
 * Compute current weight using the exponential decay formula.
 * Always computed from creation date — idempotent across multiple runs.
 *
 * w(t) = exp(−λ · t)  where t is total days since creation.
 */
function computeWeight(createdAt: string, referenceCount: number): number {
  const totalDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  const lambda = effectiveDecayRate(referenceCount);
  return Math.exp(-lambda * totalDays);
}

/**
 * Run memory decay physics for a single agent.
 *
 * Steps:
 *  1. Load active, non-archived memories (most recent BATCH_SIZE).
 *  2. Recompute weight for each using the decay formula.
 *  3. Archive memories whose weight has fallen below ARCHIVE_THRESHOLD.
 *  4. Write updated weights back to DB in a single batch.
 *
 * "Archive" means: is_active=false, archived=true, weight=0.
 * The row is kept — it can be reviewed in ops tooling and never silently lost.
 */
export async function runMemoryPhysics(agentId: string): Promise<void> {
  const db = createServiceClient();

  // Load only active, non-archived memories — ones that still matter
  const { data: memories, error } = await db
    .from("memories")
    .select("id, created_at, reference_count, weight, archived")
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .eq("archived", false)
    .order("created_at", { ascending: true }) // oldest first — most likely to archive
    .limit(BATCH_SIZE);

  if (error || !memories || memories.length === 0) return;

  const toArchive: string[] = [];
  const weightUpdates: Array<{ id: string; weight: number }> = [];

  for (const raw of memories) {
    const mem = raw as MemoryRow;
    const refCount = mem.reference_count ?? 0;
    const weight = computeWeight(mem.created_at, refCount);

    if (weight < ARCHIVE_THRESHOLD) {
      toArchive.push(mem.id);
    } else {
      // Round to 4 decimal places — avoids endless micro-updates
      weightUpdates.push({ id: mem.id, weight: Math.round(weight * 10_000) / 10_000 });
    }
  }

  // Archive memories that have decayed past the threshold
  if (toArchive.length > 0) {
    try {
      await db
        .from("memories")
        .update({ is_active: false, archived: true, weight: 0 })
        .in("id", toArchive);
    } catch {
      // archived column may not exist yet (pre-migration) — fall back to is_active only
      await db
        .from("memories")
        .update({ is_active: false })
        .in("id", toArchive);
    }
  }

  // Update weights for surviving memories
  // Single-row updates are acceptable here — physics runs infrequently (per heartbeat)
  await Promise.allSettled(
    weightUpdates.map(({ id, weight }) =>
      db.from("memories").update({ weight }).eq("id", id)
    )
  );
}

/**
 * Increment reference counts for a set of memory IDs.
 * Uses batch RPC when available; falls back to individual updates.
 * Each reference increment slows the memory's future decay rate.
 */
export async function incrementReferenceCounts(agentId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = createServiceClient();
  try {
    await db.rpc("batch_increment_reference_count", { p_ids: ids });
  } catch {
    // RPC not deployed yet — individual updates as fallback
    for (const id of ids) {
      const { data } = await db
        .from("memories")
        .select("reference_count")
        .eq("id", id)
        .single();
      const count = (data?.reference_count ?? 0) + 1;
      await db.from("memories").update({ reference_count: count }).eq("id", id);
    }
  }
}

/**
 * Returns the effective decay rate for a given reference count.
 * Exported for testing and ops tooling.
 */
export { effectiveDecayRate, computeWeight, ARCHIVE_THRESHOLD, BASE_DECAY_RATE };
