import { createServiceClient } from "@/lib/supabase/service";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COSINE_THRESHOLD = 0.8;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function runMemoryPhysics(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("memories")
    .select("id, content, embedding, importance, reference_count, is_active, created_at, updated_at")
    .eq("agent_id", agentId)
    .limit(200);

  const memories = (rows ?? []) as {
    id: string;
    content?: string;
    embedding?: number[];
    importance?: number;
    reference_count?: number;
    is_active?: boolean;
    updated_at?: string;
  }[];

  if (memories.length < 2) return;

  const now = Date.now();

  for (const m of memories) {
    if (!m.embedding || m.embedding.length === 0) continue;
    let maxSim = 0;
    for (const other of memories) {
      if (other.id === m.id || !other.embedding?.length) continue;
      const sim = cosineSimilarity(m.embedding, other.embedding);
      if (sim > maxSim) maxSim = sim;
    }
    if (maxSim >= COSINE_THRESHOLD) {
      try {
        const importance = Math.min(1, (m.importance ?? 0.5) + 0.1);
        await service.from("memories").update({ importance }).eq("id", m.id);
      } catch {
        // importance column may not exist
      }
    }
  }

  for (const m of memories) {
    const refCount = m.reference_count ?? 0;
    const updatedAt = m.updated_at ? new Date(m.updated_at).getTime() : 0;
    const daysSinceRef = updatedAt ? (now - updatedAt) / (24 * 60 * 60 * 1000) : 999;
    if (daysSinceRef >= 30) {
      try {
        await service.from("memories").update({ is_active: false }).eq("id", m.id);
      } catch {
        // column may not exist
      }
    }
  }

  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const a = memories[i];
      const b = memories[j];
      if (!a.embedding?.length || !b.embedding?.length) continue;
      const sim = cosineSimilarity(a.embedding, b.embedding);
      if (sim >= COSINE_THRESHOLD && a.content && b.content) {
        const conflict = a.content.slice(0, 100) !== b.content.slice(0, 100);
        if (conflict) {
          await service.from("autonomous_logs").insert({
            agent_id: agentId,
            action_type: "memory_collision",
            summary: `Contradiction between memories: ${a.id.slice(0, 8)}, ${b.id.slice(0, 8)}`,
          });
          break;
        }
      }
    }
  }
}

export async function incrementReferenceCounts(
  agentId: string,
  memoryIds: string[]
): Promise<void> {
  if (memoryIds.length === 0) return;
  const service = createServiceClient();
  for (const id of memoryIds) {
    try {
      const { data: row } = await service.from("memories").select("reference_count").eq("id", id).eq("agent_id", agentId).single();
      const ref = (Number((row as { reference_count?: number })?.reference_count) ?? 0) + 1;
      await service.from("memories").update({
        reference_count: ref,
        is_active: true,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    } catch {
      // columns reference_count / is_active may not exist
    }
  }
}
