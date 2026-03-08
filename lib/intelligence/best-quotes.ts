import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export type BestQuoteEntry = { quote: string; date: string; context?: string };

export async function updateBestQuotes(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("memories")
    .select("content, created_at")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!rows?.length) return;

  const sample = (rows as { content?: string; created_at?: string }[])
    .slice(0, 30)
    .map((r) => r.content ?? "")
    .join("\n---\n");
  const raw = (await generateJSON(
    "From user messages only, pick the 1 most meaningful or memorable quote. Respond ONLY JSON.",
    `Conversations:\n${sample}\n\nJSON: {"quote":"exact user quote","context":"one line why"}`,
  )) as Record<string, unknown> | null;
  if (!raw?.quote) return;

  const quote = String(raw.quote).slice(0, 500);
  const context = raw.context ? String(raw.context).slice(0, 200) : undefined;
  const date = (rows[0] as { created_at?: string })?.created_at ?? new Date().toISOString();

  const { data: state } = await service.from("agent_state").select("best_quotes").eq("agent_id", agentId).single();
  const list = (state?.best_quotes as BestQuoteEntry[]) ?? [];
  const next = [...list, { quote, date, context }].slice(-20);
  await service.from("agent_state").update({ best_quotes: next }).eq("agent_id", agentId);
}
