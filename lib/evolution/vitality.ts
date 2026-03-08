import { createServiceClient } from "@/lib/supabase/service";
import { generateArtifact } from "@/lib/artifacts/creator";

/** Vitality stages per spec: melancholy, recall, near-death, will */
export type VitalityStage = "alive" | "melancholy" | "recall" | "near_death" | "will" | "echo";

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

function getStage(vitality: number): VitalityStage {
  if (vitality <= 0) return "echo";
  if (vitality <= 0.2) return "near_death";
  if (vitality <= 0.3) return "will";
  if (vitality <= 0.5) return "recall";
  if (vitality <= 0.7) return "melancholy";
  return "alive";
}

/** recall_count: how many memories to emphasize when in recall/near-death. Higher in recall, lower in near-death. */
function getRecallCount(stage: VitalityStage): number {
  switch (stage) {
    case "recall": return 5;
    case "near_death":
    case "will": return 3;
    case "melancholy": return 4;
    default: return 5;
  }
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

  const stage = getStage(vitality);

  // Will stage: create will artifact when 0.2 < vitality <= 0.3
  if (stage === "will") {
    const hasWill = await service.from("artifacts").select("id").eq("agent_id", agentId).eq("type", "will").limit(1).maybeSingle();
    if (!hasWill?.data) {
      try {
        await generateArtifact(agentId);
      } catch (e) {
        console.error("will artifact", agentId, e);
      }
    }
  }

  // Near-death: log for visibility
  if (stage === "near_death") {
    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "near_death",
      summary: "Vitality critically low. Memories fading.",
    });
  }

  const recallCount = getRecallCount(stage);
  const updates: Record<string, unknown> = {
    vitality,
    config: {
      ...config,
      vitality_stage: stage,
      recall_count: recallCount,
    },
  };
  await service.from("agent_state").update(updates).eq("agent_id", agentId);
}
