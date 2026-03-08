import { createServiceClient } from "@/lib/supabase/service";

const TRIBE_VALUES = ["calm", "explorer", "connector", "creator"] as const;

export async function ensureTribes(): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id").limit(1);
  if (tribes && tribes.length > 0) return;

  for (const v of TRIBE_VALUES) {
    await service.from("tribes").insert({
      name: `${v}_tribe`,
      values: [v],
      members: [],
    });
  }
}

export async function assignAgentToTribe(agentId: string, value: string): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id, name, members").contains("values", [value]).limit(1);
  const tribe = tribes?.[0] as { id: string; members?: string[] } | undefined;
  if (!tribe) return;
  const members = Array.isArray(tribe.members) ? tribe.members : [];
  if (members.includes(agentId)) return;
  members.push(agentId);
  await service.from("tribes").update({ members }).eq("id", tribe.id);
}

export async function electLeaders(): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id, members");
  for (const t of tribes ?? []) {
    const members = (t as { members?: string[] }).members ?? [];
    if (members.length === 0) continue;
    const { data: memCounts } = await service.from("memories").select("agent_id").in("agent_id", members);
    const count: Record<string, number> = {};
    (memCounts ?? []).forEach((r) => {
      const id = (r as { agent_id: string }).agent_id;
      count[id] = (count[id] ?? 0) + 1;
    });
    const sorted = members.sort((a, b) => (count[b] ?? 0) - (count[a] ?? 0));
    const leader = sorted[0];
    if (leader) await service.from("tribes").update({ leader_agent_id: leader }).eq("id", (t as { id: string }).id);
  }
}
