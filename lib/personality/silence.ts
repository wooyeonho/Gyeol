import { createServiceClient } from "@/lib/supabase/service";

export async function detectSilence(agentId: string) {
  const db = createServiceClient();
  const { data: recentChats } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1);
  if (!recentChats?.[0]) return;

  const hoursSinceChat = (Date.now() - new Date(recentChats[0].created_at).getTime()) / 3600000;
  if (hoursSinceChat > 72) {
    const { data: state } = await db.from("agent_state").select("config").eq("agent_id", agentId).single();
    if (state && !state.config?.pending_question) {
      await db.from("agent_state").update({
        config: { ...state.config, pending_question: "요즘 들어오는데 아무 말 안 해서... 괜찮아?" }
      }).eq("agent_id", agentId);
    }
  }
}
