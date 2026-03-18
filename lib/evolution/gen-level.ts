import { createServiceClient } from "@/lib/supabase/service";

const RATES: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0.05 };
type VisualUpgrade = {
  shape?: "sphere" | "polygon" | "complex" | "transcendent";
  particles?: number;
  glow?: number;
};

const VISUAL_UPGRADES: Record<number, VisualUpgrade> = {
  2: { shape: "sphere", particles: 3 },
  3: { shape: "polygon", particles: 8, glow: 60 },
  4: { shape: "complex", particles: 18, glow: 80 },
  5: { shape: "transcendent", particles: 35, glow: 100 },
};

export async function checkEvolution(agentId: string): Promise<{ evolved: boolean; newLevel?: number; mutation?: string } | null> {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("progress, gen_level, visual, config, total_messages").eq("agent_id", agentId).single();
  if (!state) return null;

  // Base progress + behavior-based bonus
  let progress = (state.progress || 0) + Math.random() * 1.5 + 0.5;

  // Reward active engagement: more messages = faster evolution
  const lastEvoMessages = typeof state.config?.total_messages_at_last_evo === "number"
    ? (state.config.total_messages_at_last_evo as number) : 0;
  const currentTotal = typeof state.total_messages === "number" ? state.total_messages : 0;
  const messagesSinceLastEvo = Math.max(0, currentTotal - lastEvoMessages);
  if (messagesSinceLastEvo > 5) progress += Math.min(5, messagesSinceLastEvo * 0.3);

  if (Math.random() < 0.05) progress += Math.random() * 7 + 3; // critical

  if (progress < 100) {
    await db.from("agent_state").update({ progress }).eq("agent_id", agentId);
    return { evolved: false };
  }

  const rate = RATES[state.gen_level] || 0.01;
  if (Math.random() < rate) {
    const newLevel = state.gen_level + 1;
    const upgrade = VISUAL_UPGRADES[newLevel] || {};
    const mutation = Math.random() < 0.05 ? ["empathy_master", "logic_genius", "dream_weaver", "social_butterfly", "memory_keeper"][Math.floor(Math.random() * 5)] : undefined;

    await db.from("agent_state").update({
      gen_level: newLevel,
      progress: 0,
      visual: { ...state.visual, ...upgrade },
      config: { ...state.config, ...(mutation ? { mutation_trait: mutation } : {}), total_messages_at_last_evo: currentTotal },
    }).eq("agent_id", agentId);

    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "evolution", summary: `Evolved to Gen ${newLevel}${mutation ? ` (${mutation})` : ""}` });
    return { evolved: true, newLevel, mutation };
  }

  await db.from("agent_state").update({ progress: 80 }).eq("agent_id", agentId);
  return { evolved: false };
}
