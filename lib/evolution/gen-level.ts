import { createServiceClient } from "@/lib/supabase/service";

const RATES: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0.05 };
const VISUAL_UPGRADES: Record<number, any> = {
  2: { shape: "sphere", particles: 3 },
  3: { shape: "polygon", particles: 8, glow: 60 },
  4: { shape: "complex", particles: 18, glow: 80 },
  5: { shape: "transcendent", particles: 35, glow: 100 },
};

export async function checkEvolution(agentId: string): Promise<{ evolved: boolean; newLevel?: number; mutation?: string } | null> {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("progress, gen_level, visual, config").eq("agent_id", agentId).single();
  if (!state) return null;

  let progress = (state.progress || 0) + Math.random() * 1.5 + 0.5;
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
      ...(mutation ? { config: { ...state.config, mutation_trait: mutation } } : {}),
    }).eq("agent_id", agentId);

    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "evolution", summary: `Evolved to Gen ${newLevel}${mutation ? ` (${mutation})` : ""}` });
    return { evolved: true, newLevel, mutation };
  }

  await db.from("agent_state").update({ progress: 80 }).eq("agent_id", agentId);
  return { evolved: false };
}
