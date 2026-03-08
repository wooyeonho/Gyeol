import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

type Term = { word: string; meaning?: string; origin?: string };

export async function detectAndSaveSharedLanguage(agentId: string, recentUserMessage: string, recentAiMessage: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("shared_language").eq("agent_id", agentId).single();
  const current = (state?.shared_language as { terms?: Term[] } | null) ?? { terms: [] };
  const existingWords = new Set((current.terms ?? []).map((t) => t.word.toLowerCase()));

  const system = "From the conversation, detect one shared meme, slang, or inside word/phrase (e.g. a nickname, code word). Respond ONLY JSON.";
  const user = `User: ${recentUserMessage}\nAssistant: ${recentAiMessage}\n\nJSON: {"word":"single word or short phrase","meaning":"brief meaning","origin":"optional origin"}. If none clear, return {"word":null}.`;

  const raw = await generateJSON(system, user) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object" || !raw.word || existingWords.has(String(raw.word).toLowerCase())) return;

  const word = String(raw.word).trim().slice(0, 50);
  const meaning = raw.meaning ? String(raw.meaning).slice(0, 200) : undefined;
  const origin = raw.origin ? String(raw.origin).slice(0, 200) : undefined;
  const terms = [...(current.terms ?? []), { word, meaning, origin }].slice(-30);

  await service.from("agent_state").update({ shared_language: { terms } }).eq("agent_id", agentId);
}

export function getSharedLanguageTerms(sharedLanguage: { terms?: Term[] } | null): Term[] {
  return sharedLanguage?.terms ?? [];
}
