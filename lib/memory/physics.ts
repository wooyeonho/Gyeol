import { createServiceClient } from "@/lib/supabase/service";

export async function runMemoryPhysics(agentId: string) {
  const db = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  try {
    await db.from("memories").update({ is_active: false }).eq("agent_id", agentId).eq("reference_count", 0).lt("created_at", thirtyDaysAgo);
  } catch {
    // is_active column may not exist
  }
}

export async function incrementReferenceCounts(agentId: string, ids: string[]) {
  const db = createServiceClient();
  for (const id of ids) {
    const { data } = await db.from("memories").select("reference_count").eq("id", id).single();
    const count = (data?.reference_count || 0) + 1;
    await db.from("memories").update({ reference_count: count }).eq("id", id);
  }
}
