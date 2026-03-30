import { createServiceClient } from "@/lib/supabase/service";
import type { CreatureDNA } from "@/lib/genome/dna";
import { applyDnaShift } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { generatePortraitPrompt } from "@/lib/genome/portrait-prompt";

/**
 * Evolution rate by gen level.
 * No upper cap — higher gens use diminishing but never-zero rates.
 * Gen 1→2 is easy, Gen 10→11 is hard but possible, Gen 50→51 is very rare.
 */
function getEvolutionRate(genLevel: number): number {
  // Known rates for early gens (backward compat)
  const EARLY_RATES: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0.1, 5: 0.06 };
  if (EARLY_RATES[genLevel] !== undefined) return EARLY_RATES[genLevel];
  // Logarithmic decay: never reaches zero, but gets increasingly rare
  // Gen 10: ~0.02, Gen 20: ~0.013, Gen 50: ~0.008
  return Math.max(0.005, 0.06 / (1 + (genLevel - 5) * 0.15));
}

type VisualUpgrade = {
  particles?: number;
  glow?: number;
};

/**
 * Compute visual upgrades for any gen level (open-ended).
 * Instead of a fixed lookup table, uses continuous scaling.
 */
function getVisualUpgrade(genLevel: number): VisualUpgrade {
  if (genLevel <= 1) return {};
  // Particles: logarithmic growth, never capped
  const particles = Math.round(2 + Math.log2(genLevel) * 8);
  // Glow: approaches 100 asymptotically, can exceed at very high gens
  const glow = Math.min(100 + (genLevel - 10) * 0.5, 30 + 70 * (1 - 1 / (1 + (genLevel - 1) * 0.3)));
  return { particles: Math.max(0, particles), glow: Math.max(0, Math.round(glow)) };
}

export async function checkEvolution(agentId: string): Promise<{ evolved: boolean; newLevel?: number; mutation?: string } | null> {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("progress, gen_level, visual, config, total_messages, genome").eq("agent_id", agentId).single();
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

  const rate = getEvolutionRate(state.gen_level);
  if (Math.random() < rate) {
    const newLevel = state.gen_level + 1;
    const upgrade = getVisualUpgrade(newLevel);
    // Mutation: instead of 5 preset traits, pick a random DNA axis and shift it.
    // This creates unpredictable evolution — no two creatures follow the same path.
    const DNA_AXES = [
      "curiosity", "warmth", "intensity", "stability", "playfulness",
      "assertiveness", "empathy", "independence", "creativity", "analytical",
      "intuitive", "persistence", "adaptability", "openness", "verbal", "spatial",
    ] as const;
    const mutation = Math.random() < 0.08
      ? `dna_shift:${DNA_AXES[Math.floor(Math.random() * DNA_AXES.length)]}:${(Math.random() > 0.5 ? "+" : "-")}${(0.05 + Math.random() * 0.15).toFixed(2)}`
      : undefined;

    // Apply dna_shift mutation to the actual genome if present
    let genomeUpdate: Record<string, unknown> | undefined;
    if (mutation) {
      const genome = state.genome as { dna?: CreatureDNA } | null;
      if (genome?.dna) {
        const { dna: mutatedDna, axis } = applyDnaShift(genome.dna, mutation);
        if (axis) {
          genomeUpdate = { ...genome, dna: mutatedDna };
        }
      }
    }

    await db.from("agent_state").update({
      gen_level: newLevel,
      progress: 0,
      visual: { ...state.visual, ...upgrade },
      config: { ...state.config, ...(mutation ? { mutation_trait: mutation } : {}), total_messages_at_last_evo: currentTotal },
      ...(genomeUpdate ? { genome: genomeUpdate } : {}),
    }).eq("agent_id", agentId);

    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "evolution", summary: `Evolved to Gen ${newLevel}${mutation ? ` (${mutation})` : ""}` });

    // Auto-trigger portrait generation on evolution (fire-and-forget)
    triggerEvolutionPortrait(db, agentId, newLevel).catch((err) =>
      console.error("[GenLevel] portrait auto-trigger failed:", err),
    );

    return { evolved: true, newLevel, mutation };
  }

  await db.from("agent_state").update({ progress: 80 }).eq("agent_id", agentId);
  return { evolved: false };
}

/**
 * Auto-generate a portrait when creature evolves.
 * Runs server-side using the service client (no user auth needed).
 * Stores the portrait as an artifact for the gallery.
 */
async function triggerEvolutionPortrait(
  db: ReturnType<typeof createServiceClient>,
  agentId: string,
  newLevel: number,
): Promise<void> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return; // CF not configured — skip silently

  // Fetch agent genome for prompt generation
  const { data: row } = await db
    .from("agent_state")
    .select("genome, self_name, mood")
    .eq("agent_id", agentId)
    .single();
  if (!row) return;

  const genome = row.genome as { dna?: CreatureDNA } | null;
  const dna = genome?.dna;
  if (!dna) return;

  const species = deriveSpecies(dna);
  const selfName = (row.self_name as string) ?? undefined;
  const mood = (row.mood as string) ?? undefined;

  const prompt = generatePortraitPrompt(dna, species, {
    genLevel: newLevel,
    mood,
    context: "portrait",
    selfName,
  });

  // Call CF Workers AI
  const CF_SDXL_PATH = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_SDXL_PATH}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt: prompt.slice(0, 1500), num_steps: 20, width: 1024, height: 1024 }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      console.error(`[GenLevel] portrait CF ${res.status}`);
      return;
    }

    const buffer = await res.arrayBuffer();
    const imageUrl = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;

    const title = `${species.name} — evolution (Gen ${newLevel})`;
    await db.from("artifacts").insert({
      agent_id: agentId,
      type: "creature_portrait",
      title,
      content: JSON.stringify({
        image: imageUrl,
        prompt: prompt.slice(0, 500),
        context: "portrait",
        species: species.name,
        archetype: species.archetype,
        element: species.element,
        genLevel: newLevel,
        mood,
        autoGenerated: true,
      }),
      is_preserved: true,
      is_public: false,
    });

    await db.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "portrait_generation",
      summary: `Evolution portrait auto-generated: ${species.name} (Gen ${newLevel})`,
    });
  } catch (err) {
    console.error("[GenLevel] portrait generation error:", err);
  } finally {
    clearTimeout(timer);
  }
}
