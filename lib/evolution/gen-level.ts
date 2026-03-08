import { createServiceClient } from "@/lib/supabase/service";

const MUTATION_TRAITS = ["empathy_master", "night_owl", "curiosity_drive", "calm_center", "creative_burst"];

export type EvolutionResult = { success: boolean; level?: number; mutation?: string };

export async function checkEvolution(agentId: string): Promise<EvolutionResult> {
  const service = createServiceClient();
  const { data: row } = await service.from("agent_state").select("progress, gen_level, config, visual").eq("agent_id", agentId).single();
  if (!row) return { success: false };

  const progress = (row.progress as number) ?? 0;
  const genLevel = (row.gen_level as number) ?? 1;
  const config = (row.config as Record<string, unknown>) ?? {};
  const visual = (row.visual as Record<string, unknown>) ?? {};

  let newProgress = progress + 0.5 + Math.random() * 1.5;
  if (Math.random() < 0.05) newProgress += 3 + Math.random() * 7;

  if (newProgress < 100) {
    await service.from("agent_state").update({ progress: Math.min(100, newProgress) }).eq("agent_id", agentId);
    return { success: false };
  }

  const rates: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0.05 };
  const rate = rates[genLevel] ?? 0;
  const success = Math.random() < rate;

  if (success) {
    const newLevel = genLevel + 1;
    const mutationTrait = Math.random() < 0.05 ? MUTATION_TRAITS[Math.floor(Math.random() * MUTATION_TRAITS.length)] : undefined;
    if (mutationTrait) {
      (config as Record<string, unknown>)[mutationTrait] = true;
    }

    const shapeOrder = ["dot", "sphere", "polygon", "complex", "transcendent"];
    const newShape = shapeOrder[Math.min(newLevel - 1, shapeOrder.length - 1)];
    const newVisual = {
      ...visual,
      shape: newShape,
      particles: Math.min(50, ((visual.particles as number) ?? 20) + 5),
      glow: Math.min(100, ((visual.glow as number) ?? 60) + 10),
    };

    await service.from("agent_state").update({
      progress: 0,
      gen_level: newLevel,
      config,
      visual: newVisual,
      pending_evolution: { level: newLevel, mutation: mutationTrait ?? null },
    }).eq("agent_id", agentId);

    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "evolution",
      summary: `Gen ${newLevel}${mutationTrait ? ` mutation: ${mutationTrait}` : ""}`,
    });

    return { success: true, level: newLevel, mutation: mutationTrait };
  }

  await service.from("agent_state").update({ progress: 80 }).eq("agent_id", agentId);
  return { success: false };
}
