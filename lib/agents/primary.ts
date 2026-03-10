import type { createServiceClient } from "@/lib/supabase/service";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from">;

const INITIAL_AGENT_STATE = {
  total_messages: 0,
  intimacy_score: 0,
  vitality: 1,
  progress: 0,
  gen_level: 1,
  coins: 50,
};

export async function getPrimaryAgent(db: DbClient, userId: string) {
  const { data: agents } = await db
    .from("agents")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(2);

  const rows = (agents ?? []) as Array<{ id: string; created_at?: string }>;
  return {
    agentId: rows[0]?.id ?? null,
    createdAt: rows[0]?.created_at,
    hasMultiple: rows.length > 1,
  };
}

export async function ensurePrimaryAgent(db: DbClient, userId: string) {
  const existing = await getPrimaryAgent(db, userId);
  if (existing.agentId) return existing;

  const { data: newAgent } = await db
    .from("agents")
    .insert({ user_id: userId })
    .select("id, created_at")
    .single();

  const agentId = (newAgent as { id?: string } | null)?.id ?? null;
  if (!agentId) {
    return { agentId: null, createdAt: undefined, hasMultiple: false };
  }

  await db.from("agent_state").insert({
    agent_id: agentId,
    ...INITIAL_AGENT_STATE,
  });

  return {
    agentId,
    createdAt: (newAgent as { created_at?: string } | null)?.created_at,
    hasMultiple: false,
  };
}
