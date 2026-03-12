import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateImage } from "@/lib/artifacts/image-gen";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export type ComicPanel = { image: string; text: string };

export async function generateComic(agentId: string): Promise<{ panels: ComicPanel[] } | null> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("fragments, self_name, comic_style, config")
    .eq("agent_id", agentId)
    .single();
  if (!stateRow) return null;
  const state = stateRow as {
    fragments?: string[];
    self_name?: string;
    comic_style?: { style?: string; character_desc?: string };
    config?: unknown;
  };
  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);

  const { data: memRows } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);
  const mems = (memRows ?? []).map((r) => (r as { content?: string }).content ?? "").filter(Boolean);
  const memoryText = mems.slice(0, 5).join("\n");

  const selfName = state.self_name ?? "I";
  const systemPrompt = `You are ${selfName}. Output ONLY valid JSON.`;
  const userPrompt = `Memories (last week):\n${memoryText.slice(0, 800)}\n\nCreate a 4-panel comic strip. Each panel: one short line in ${language} (dialogue or narration). JSON: {"panels":["line1","line2","line3","line4"]}`;
  const out = (await generateJSON(systemPrompt, userPrompt)) as { panels?: string[] } | null;
  const lines = out?.panels;
  if (!Array.isArray(lines) || lines.length < 4) return null;

  const panels: ComicPanel[] = [];
  for (let i = 0; i < 4; i++) {
    const text = lines[i] ?? "";
    const imagePrompt = `comic panel ${i + 1}, simple illustration, ${state.comic_style?.style ?? "simple"} style, scene: ${text.slice(0, 80)}`;
    const image = await generateImage(agentId, "mood", imagePrompt);
    panels.push({ image: image ?? "", text });
  }

  return { panels };
}

export async function saveComicArtifact(agentId: string, panels: ComicPanel[]): Promise<void> {
  const service = createServiceClient();
  const expiresAt = new Date(Date.now() + FORTY_EIGHT_HOURS_MS).toISOString();
  await service.from("artifacts").insert({
    agent_id: agentId,
    type: "comic",
    content: JSON.stringify({ panels }),
    expires_at: expiresAt,
    is_preserved: false,
  });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "comic_creation",
    summary: panels.map((p) => p.text).join(" / ").slice(0, 150),
  });
}
