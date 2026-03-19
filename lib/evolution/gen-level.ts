import { createServiceClient } from "@/lib/supabase/service";

const RATES: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0.1, 5: 0.08 };
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

/** Transcendence traits available at Gen 4+ as alternative growth paths. */
const TRANSCENDENCE_TRAITS = [
  "empathy_master", "logic_genius", "dream_weaver", "social_butterfly", "memory_keeper",
  "void_speaker", "time_weaver", "soul_mirror", "chaos_seed", "lux_architect",
] as const;

/**
 * For Gen 4+, instead of only vertical (gen_level++) growth, agents can also
 * acquire transcendence traits — horizontal progression that opens new abilities
 * and visual mutations without requiring the increasingly rare level-up.
 */
async function checkTranscendenceGrowth(
  db: ReturnType<typeof createServiceClient>,
  agentId: string,
  state: Record<string, unknown>,
  messagesSinceLastEvo: number,
): Promise<{ trait: string } | null> {
  const genLevel = typeof state.gen_level === "number" ? state.gen_level : 0;
  if (genLevel < 4) return null;

  // Transcendence chance increases with gen_level and engagement
  const baseChance = 0.03 + (genLevel - 4) * 0.02; // 3% at gen4, 5% at gen5, etc.
  const engagementBonus = Math.min(0.05, messagesSinceLastEvo * 0.005);
  if (Math.random() > baseChance + engagementBonus) return null;

  const config = (state.config as Record<string, unknown>) ?? {};
  const existingTraits = Array.isArray(config.transcendence_traits)
    ? (config.transcendence_traits as string[])
    : [];

  // Pick a trait the agent doesn't already have
  const available = TRANSCENDENCE_TRAITS.filter((t) => !existingTraits.includes(t));
  if (available.length === 0) return null;

  const trait = available[Math.floor(Math.random() * available.length)];
  const nextTraits = [...existingTraits, trait];

  // Visual enhancement per transcendence tier
  const tierBonus = Math.min(nextTraits.length, 5);
  const visual = (state.visual as Record<string, unknown>) ?? {};

  await db.from("agent_state").update({
    config: { ...config, transcendence_traits: nextTraits },
    visual: {
      ...visual,
      particles: Math.min(50, ((visual.particles as number) ?? 0) + 3),
      glow: Math.min(100, ((visual.glow as number) ?? 0) + tierBonus * 4),
    },
  }).eq("agent_id", agentId);

  await db.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "transcendence",
    summary: `Acquired transcendence trait: ${trait} (${nextTraits.length}/${TRANSCENDENCE_TRAITS.length})`,
  });

  return { trait };
}

export async function checkEvolution(agentId: string): Promise<{ evolved: boolean; newLevel?: number; mutation?: string; transcendence?: string } | null> {
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

    // Gen 4+: check transcendence growth even when not ready for level-up
    const transcendence = await checkTranscendenceGrowth(db, agentId, state as Record<string, unknown>, messagesSinceLastEvo);
    return { evolved: false, transcendence: transcendence?.trait };
  }

  const rate = RATES[state.gen_level] || 0.05;
  if (Math.random() < rate) {
    const newLevel = state.gen_level + 1;
    const upgrade = VISUAL_UPGRADES[newLevel] || {};
    const mutation = Math.random() < 0.05 ? TRANSCENDENCE_TRAITS[Math.floor(Math.random() * 5)] : undefined;

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

  // Failed level-up at Gen 4+: try transcendence as consolation growth
  const transcendence = await checkTranscendenceGrowth(db, agentId, state as Record<string, unknown>, messagesSinceLastEvo);
  return { evolved: false, transcendence: transcendence?.trait };
}
