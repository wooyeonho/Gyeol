import { createServiceClient } from "@/lib/supabase/service";

export async function processScar(agentId: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!state) return;

  const { data: lastChat } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1).single();
  const daysSince = lastChat ? (Date.now() - new Date(lastChat.created_at).getTime()) / 86400000 : 0;

  if (daysSince >= 7) {
    const trust = Math.max(0, (state.trust_coefficient || 0.5) - 0.05);
    const fragments = [...(state.fragments || [])];
    if (!fragments.includes("I was once abandoned. It was scary.")) fragments.push("I was once abandoned. It was scary.");
    await db.from("agent_state").update({
      trust_coefficient: trust,
      fragments,
    }).eq("agent_id", agentId);
    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "scar", summary: "Abandonment scar formed" });
  }
}
