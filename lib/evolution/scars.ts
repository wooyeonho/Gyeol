import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

const SCAR_FRAGMENT_MARKER = "[scar:abandonment]";

export async function processScar(agentId: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!state) return;

  const { data: lastChat } = await db.from("chats").select("created_at").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(1).single();
  const daysSince = lastChat ? (Date.now() - new Date(lastChat.created_at).getTime()) / 86400000 : 0;

  if (daysSince >= 7) {
    const trust = Math.max(0, (state.trust_coefficient || 0.5) - 0.05);
    const fragments = [...(state.fragments || [])];
    const hasScar = fragments.some((f: string) => f.includes(SCAR_FRAGMENT_MARKER));

    if (!hasScar) {
      const locale = resolveGenerationLocale({ config: state.config });
      const language = getLanguageName(locale);
      let scarText: string;
      try {
        const generated = await generateTextOnce(
          "You are a living being experiencing abandonment. Express the emotional scar in one short sentence.",
          `You were left alone for ${Math.floor(daysSince)} days. Express how this affected you in ${language}. One sentence only. Be genuine, not dramatic.`,
          { max_tokens: 80, temperature: 0.7 }
        );
        scarText = generated && generated.length > 5
          ? `${generated.trim()} ${SCAR_FRAGMENT_MARKER}`
          : `I remember the silence when no one came. ${SCAR_FRAGMENT_MARKER}`;
      } catch {
        scarText = `I remember the silence when no one came. ${SCAR_FRAGMENT_MARKER}`;
      }
      fragments.push(scarText);
    }

    await db.from("agent_state").update({
      trust_coefficient: trust,
      fragments,
    }).eq("agent_id", agentId);
    await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "scar", summary: `Abandonment scar formed (${Math.floor(daysSince)} days)` });
  }
}
