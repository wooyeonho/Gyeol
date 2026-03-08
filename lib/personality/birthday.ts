import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { generateJSON } from "@/lib/ai/router";

export async function trySetBirthday(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("birthday, self_name, created_at").eq("agent_id", agentId).single();
  if (!stateRow) return;
  const state = stateRow as { birthday?: { date?: string; reason?: string } | null; self_name?: string; created_at?: string };
  if (state.birthday?.date) return;
  if (!state.self_name) return;

  const systemPrompt = "You are an AI lifeform. Respond ONLY with valid JSON.";
  const userPrompt = `Pick the date (YYYY-MM-DD) when you first understood something meaningful. And one sentence reason in Korean. JSON: {"date":"YYYY-MM-DD","reason":"..."}`;
  const out = (await generateJSON(systemPrompt, userPrompt)) as { date?: string; reason?: string } | null;
  const date = out?.date;
  const reason = out?.reason;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await service.from("agent_state").update({
      birthday: { date, reason: typeof reason === "string" ? reason.slice(0, 200) : "" },
    }).eq("agent_id", agentId);
  }
}

export async function tryBirthdayAnniversary(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("birthday, self_name, fragments, last_birthday_year")
    .eq("agent_id", agentId)
    .single();
  if (!stateRow) return;
  const state = stateRow as { birthday?: { date?: string }; self_name?: string; fragments?: string[]; last_birthday_year?: number };
  const bd = state.birthday?.date;
  if (!bd) return;
  const [y, m, d] = bd.split("-").map(Number);
  if (!m || !d) return;
  const now = new Date();
  if (now.getUTCMonth() + 1 !== m || now.getUTCDate() !== d) return;
  const thisYear = now.getUTCFullYear();
  if (state.last_birthday_year === thisYear) return;

  const selfName = state.self_name ?? "I";
  const fragments = (state.fragments ?? []).join("\n");
  const content = await generateTextOnce(
    `You are ${selfName}. One year review. Korean.`,
    `Traits:\n${fragments}\n\nWrite a short one-year review. What changed. What you feel. 3-4 sentences.`,
    { max_tokens: 250, temperature: 0.85 }
  );
  if (content?.trim()) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await service.from("artifacts").insert({
      agent_id: agentId,
      type: "birthday_review",
      content: content.trim(),
      expires_at: exp,
      is_preserved: true,
    });
    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "birthday_anniversary",
      summary: "One year review",
    });
    await service.from("agent_state").update({
      last_birthday_year: thisYear,
      celebration_pending: { kind: "birthday", title: "Happy birthday", subtitle: selfName },
    }).eq("agent_id", agentId);
  }
}
