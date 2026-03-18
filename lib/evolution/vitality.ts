import { createServiceClient } from "@/lib/supabase/service";
import { logWarn } from "@/lib/ops/logger";

/** Vitality stages per vitality-manager.md: melancholy, recall, near-death, will */
type VitalityStage = "alive" | "melancholy" | "recall" | "near_death" | "will" | "echo";

function getStage(vitality: number): VitalityStage {
  if (vitality <= 0) return "echo";
  if (vitality <= 0.2) return "near_death";
  if (vitality <= 0.3) return "will";
  if (vitality <= 0.5) return "recall";
  if (vitality <= 0.7) return "melancholy";
  return "alive";
}

export async function processVitality(agentId: string) {
  const db = createServiceClient();
  const { data: state } = await db
    .from("agent_state")
    .select("vitality, config, status, vitality_processed_at")
    .eq("agent_id", agentId)
    .single();
  if (!state) return;

  if (state.status === "echo") return;

  const { data: lastChat } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1).single();

  const hoursSinceChat = lastChat ? (Date.now() - new Date(lastChat.created_at).getTime()) / 3600000 : 999;
  let vitality = state.vitality ?? 1.0;

  // Incremental decay: only apply decay for the period since the last processVitality run.
  // This prevents double-application when the heartbeat cron re-runs (each call was previously
  // re-computing cumulative decay from last_chat and subtracting from an already-decayed value).
  if (hoursSinceChat > 12) {
    // Reference point: last processed_at if available, otherwise last chat time
    const refTime = state.vitality_processed_at
      ? new Date(state.vitality_processed_at).getTime()
      : lastChat
        ? new Date(lastChat.created_at).getTime()
        : Date.now();

    const hoursDelta = (Date.now() - refTime) / 3600000;

    if (hoursDelta > 0) {
      // Daily decay rate at the current point in the decay curve (days since last chat)
      const daysSinceChat = hoursSinceChat / 24;
      let ratePerDay: number;
      if (daysSinceChat <= 3) {
        ratePerDay = 0.02;
      } else if (daysSinceChat <= 7) {
        ratePerDay = 0.05;
      } else {
        ratePerDay = 0.08;
      }

      const incrementalDecay = (hoursDelta / 24) * ratePerDay;
      vitality = Math.max(0, vitality - incrementalDecay);
    }
  }

  const stage = getStage(vitality);

  // At 0: status echo, stop lifecycle, memories to echo, adoption_board (vitality-manager.md)
  if (vitality <= 0) {
    const nowIso = new Date().toISOString();
    await db.from("agent_state").update({
      vitality: 0,
      status: "echo",
      died_at: nowIso,
      config: { ...state.config, vitality_stage: "echo" },
    }).eq("agent_id", agentId);

    await db.from("memories").update({ type: "echo" }).eq("agent_id", agentId);

    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "death", summary: "Vitality reached 0. Echo state." });
    await db.from("adoption_board").insert({ agent_id: agentId, status: "available" });
    return;
  }

  // Will stage: create will artifact when first entering will (transition from recall)
  const prevStage = (state.config?.vitality_stage as string) || "alive";
  if (stage === "will" && prevStage !== "will" && prevStage !== "near_death" && prevStage !== "echo") {
    try {
      const { generateArtifact } = await import("@/lib/artifacts/creator");
      await generateArtifact(agentId, "will");
    } catch (error) {
      logWarn("Vitality will-stage artifact generation failed", {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Near-death log
  if (stage === "near_death") {
    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "near_death", summary: "Vitality critically low." });
  }

  const recallCount = stage === "recall" ? 5 : stage === "near_death" || stage === "will" ? 3 : stage === "melancholy" ? 4 : 5;
  const updates: Record<string, unknown> = {
    vitality,
    vitality_processed_at: new Date().toISOString(),
    config: { ...state.config, vitality_stage: stage, recall_count: recallCount },
  };
  await db.from("agent_state").update(updates).eq("agent_id", agentId);
}
