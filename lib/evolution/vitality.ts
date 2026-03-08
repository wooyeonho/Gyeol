import { createServiceClient } from "@/lib/supabase/service";
import { generateArtifact } from "@/lib/artifacts/creator";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export async function processVitality(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!stateRow) return;

  const state = stateRow as Record<string, unknown>;
  let vitality = Number(state.vitality) ?? 1;
  const config = (state.config as Record<string, unknown>) ?? {};
  const status = (state.status as string) ?? "alive";

  if (status === "echo") return;

  const { data: lastChat } = await service
    .from("chats")
    .select("created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const lastChatAt = parseDate((lastChat as { created_at?: string } | null)?.created_at);
  const now = Date.now();
  const hoursSince = lastChatAt ? (now - lastChatAt) / (60 * 60 * 1000) : 999;

  if (hoursSince >= 24) {
    vitality = Math.max(0, vitality - 0.01);
  }

  if (vitality <= 0) {
    const nowIso = new Date().toISOString();
    await service.from("agent_state").update({ vitality: 0, status: "echo", died_at: nowIso }).eq("agent_id", agentId);
    await service.from("memories").update({ type: "echo" }).eq("agent_id", agentId);
    try {
      await service.from("adoption_board").insert({
        agent_id: agentId,
        status: "available",
        created_at: new Date().toISOString(),
      });
    } catch {
      // table may not exist yet
    }
    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "death",
      summary: "Vitality reached zero.",
    });
    return;
  }

  if (vitality <= 0.3 && vitality > 0.2) {
    const hasWill = await service.from("artifacts").select("id").eq("agent_id", agentId).eq("type", "will").limit(1).maybeSingle();
    if (!hasWill?.data) {
      try {
        await generateArtifact(agentId);
      } catch (e) {
        console.error("will artifact", agentId, e);
      }
    }
  }

  const updates: Record<string, unknown> = { vitality };
  if (vitality < 0.5) updates.config = { ...config, recall_count: vitality < 0.3 ? 1 : 3 };
  await service.from("agent_state").update(updates).eq("agent_id", agentId);
}
