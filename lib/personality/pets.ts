import { createServiceClient } from "@/lib/supabase/service";

export type PetEntry = { name: string; passed_at?: string; created_at: string };

const PET_PATTERNS = [
  /dog|puppy|puppies/i,
  /cat|kitten/i,
  /pet|companion/i,
  /rainbow bridge|passed away|died|crossed the bridge/i,
];

export async function processPets(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("memories")
    .select("content, created_at")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!rows?.length) return;

  const state = await service.from("agent_state").select("pets").eq("agent_id", agentId).single();
  const pets = (state?.data?.pets as PetEntry[]) ?? [];
  const knownNames = new Set(pets.map((p) => p.name.toLowerCase()));

  for (const row of rows as { content?: string; created_at?: string }[]) {
    const text = (row.content ?? "").toLowerCase();
    const isRainbow = /rainbow bridge|passed away|died|crossed the bridge/.test(text);
    for (const re of PET_PATTERNS) {
      if (!re.test(text)) continue;
      const nameMatch = text.match(/(?:my |our |named?)\s*([A-Za-z]{1,20})/i);
      const name = nameMatch ? nameMatch[1].trim() : "pet";
      const key = name.toLowerCase();
      if (knownNames.has(key)) continue;
      knownNames.add(key);
      pets.push({
        name,
        passed_at: isRainbow ? row.created_at : undefined,
        created_at: row.created_at ?? new Date().toISOString(),
      });
      break;
    }
  }

  if (pets.length > (state?.data?.pets as PetEntry[] ?? []).length) {
    await service.from("agent_state").update({ pets }).eq("agent_id", agentId);
  }
}

export async function checkPetAnniversaries(agentId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("pets").eq("agent_id", agentId).single();
  const pets = (state?.pets as PetEntry[]) ?? [];
  const now = new Date();
  for (const p of pets) {
    if (!p.passed_at) continue;
    const d = new Date(p.passed_at);
    if (d.getFullYear() < now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      return `Today is one year since ${p.name} crossed the rainbow bridge.`;
    }
  }
  return null;
}
