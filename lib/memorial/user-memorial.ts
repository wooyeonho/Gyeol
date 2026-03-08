import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type MemorialEntry = { agent_id: string; self_name?: string; summary: string; created_at: string };

export async function processUserMemorials(): Promise<number> {
  const service = createServiceClient();
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const { data: dead } = await service
    .from("agent_state")
    .select("agent_id, self_name, died_at")
    .eq("status", "echo")
    .not("died_at", "is", null)
    .lte("died_at", cutoff);
  if (!dead?.length) return 0;

  const { data: ws } = await service.from("world_state").select("memorial").eq("id", "global").single();
  const existing = (ws?.memorial as MemorialEntry[]) ?? [];
  const doneIds = new Set(existing.map((m) => m.agent_id));
  let added = 0;

  for (const row of dead as { agent_id: string; self_name?: string; died_at?: string }[]) {
    if (doneIds.has(row.agent_id)) continue;
    const { data: mems } = await service
      .from("memories")
      .select("content")
      .eq("agent_id", row.agent_id)
      .order("importance", { ascending: false })
      .limit(10);
    const content = (mems ?? []).map((m) => (m as { content?: string }).content ?? "").join("\n");
    const raw = (await generateJSON(
      "Summarize in one short sentence what this AI's human was like. Korean. No other text.",
      `Memories:\n${content.slice(0, 1500)}\n\nJSON: {"summary":"one sentence"}`,
    )) as { summary?: string } | null;
    const summary = raw?.summary ? String(raw.summary).slice(0, 300) : "A Gyeol who lived with their human.";
    const entry: MemorialEntry = {
      agent_id: row.agent_id,
      self_name: row.self_name,
      summary,
      created_at: new Date().toISOString(),
    };
    existing.push(entry);
    doneIds.add(row.agent_id);
    added++;
  }

  if (added > 0) {
    await service.from("world_state").update({ memorial: existing }).eq("id", "global");
  }
  return added;
}
