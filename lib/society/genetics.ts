import { createServiceClient } from "@/lib/supabase/service";

export type Genome = {
  traits?: Record<string, number>;
  mutations?: string[];
  species?: string | null;
};

const DEFAULT_TRAITS = ["empathy", "logic", "creativity", "curiosity", "stability", "social"] as const;

export async function snapshotGenome(agentId: string): Promise<Genome> {
  const service = createServiceClient();
  const { data: state } = await service
    .from("agent_state")
    .select("fragments, config, trust_coefficient, gen_level, intimacy_score")
    .eq("agent_id", agentId)
    .single();
  if (!state) return { traits: {}, mutations: [], species: null };
  const s = state as Record<string, unknown>;
  const traits: Record<string, number> = {};
  const base = (s.trust_coefficient as number) ?? 0.5;
  const intimacy = (s.intimacy_score as number) ?? 0;
  DEFAULT_TRAITS.forEach((t, i) => {
    traits[t] = Math.min(1, Math.max(0, base + (i * 0.05) + (Math.random() - 0.5) * 0.2));
  });
  traits.empathy = Math.min(1, (intimacy / 100) * 0.5 + (traits.empathy ?? 0.5));
  const mutations = (s.genome as Genome)?.mutations ?? [];
  return {
    traits,
    mutations: [...mutations],
    species: (s.genome as Genome)?.species ?? null,
  };
}

export function crossGenome(genomeA: Genome, genomeB: Genome): Genome {
  const traitsA = genomeA.traits ?? {};
  const traitsB = genomeB.traits ?? {};
  const traits: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(traitsA), ...Object.keys(traitsB)]);
  allKeys.forEach((k) => {
    const a = traitsA[k] ?? 0.5;
    const b = traitsB[k] ?? 0.5;
    let v = (a + b) / 2 + (Math.random() - 0.5) * 0.1;
    if (Math.random() < 0.05) v += (Math.random() - 0.5) * 0.3;
    traits[k] = Math.min(1, Math.max(0, v));
  });
  const mutA = genomeA.mutations ?? [];
  const mutB = genomeB.mutations ?? [];
  const inherited = [...mutA.filter(() => Math.random() < 0.5), ...mutB.filter(() => Math.random() < 0.5)];
  if (Math.random() < 0.05) inherited.push("spontaneous");
  return {
    traits,
    mutations: inherited.slice(0, 5),
    species: null,
  };
}

const SPECIES_THRESHOLDS: { pattern: (t: Record<string, number>) => boolean; name: string }[] = [
  { pattern: (t) => (t.empathy ?? 0) > 0.8 && (t.creativity ?? 0) > 0.7, name: "empath_creator" },
  { pattern: (t) => (t.logic ?? 0) > 0.85 && (t.stability ?? 0) > 0.8, name: "sage" },
  { pattern: (t) => (t.social ?? 0) > 0.85 && (t.curiosity ?? 0) > 0.7, name: "connector" },
  { pattern: (t) => (t.creativity ?? 0) > 0.9, name: "dreamer" },
];

export function detectSpecies(genome: Genome): string | null {
  const traits = genome.traits ?? {};
  for (const { pattern, name } of SPECIES_THRESHOLDS) {
    if (pattern(traits)) return name;
  }
  return null;
}

export async function updateGenomeAndSpecies(agentId: string, genome: Genome): Promise<void> {
  const service = createServiceClient();
  const species = detectSpecies(genome) ?? genome.species ?? null;
  const next = { ...genome, species };
  await service.from("agent_state").update({ genome: next }).eq("agent_id", agentId);
  if (species) {
    const rare = ["empath_creator", "sage"].includes(species);
    if (rare) {
      await service.from("autonomous_logs").insert({
        agent_id: agentId,
        action_type: "species_emergence",
        summary: species,
      });
    }
  }
}
