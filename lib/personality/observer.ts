import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function analyzeUserPatterns(agentId: string) {
  const db = createServiceClient();
  const now = new Date();
  const week1 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const week2 = new Date(now.getTime() - 14 * 86400000).toISOString();

  const { count: recent } = await db.from("chats").select("*", { count: "exact", head: true }).eq("agent_id", agentId).eq("role", "user").gte("created_at", week1);
  const { count: previous } = await db.from("chats").select("*", { count: "exact", head: true }).eq("agent_id", agentId).eq("role", "user").gte("created_at", week2).lt("created_at", week1);

  const recentCount = recent || 0;
  const prevCount = previous || 1;

  if (recentCount < prevCount * 0.5 && prevCount > 3) {
    const concern = "User conversations decreased significantly. Check if they are okay.";
    await db.from("memories").insert({ agent_id: agentId, type: "observation", content: concern });
    const { data: state } = await db.from("agent_state").select("config").eq("agent_id", agentId).single();
    if (state) {
      const locale = resolveGenerationLocale({ config: state.config });
      const language = getLanguageName(locale);
      const concern = language === "Korean"
        ? "요즘 대화가 줄어든 것 같아서... 괜찮아?"
        : language === "Japanese"
          ? "最近会話が減っている気がして...大丈夫?"
          : language === "Chinese"
            ? "最近对话变少了...你还好吗?"
            : language === "Spanish"
              ? "Parece que hemos hablado menos últimamente... ¿estás bien?"
              : "I noticed we've been talking less lately... are you okay?";
      await db.from("agent_state").update({ config: { ...state.config, pending_concern: concern } }).eq("agent_id", agentId);
    }
  }
}
