import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

type PersonalityResult = {
  tone_suggestion?: string;
  new_fragment?: string | null;
  mood?: string;
  visual_suggestion?: { color?: string; animation?: string } | null;
};

export async function analyzePersonality(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: userChats } = await service
    .from("chats")
    .select("content")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(10);
  const texts = (userChats ?? []).map((r) => (r as { content?: string }).content ?? "").reverse();
  if (texts.length === 0) return;

  const systemPrompt = "Analyze conversations. Respond ONLY valid JSON, no markdown.";
  const userPrompt = `Conversations:\n${texts.join("\n")}\n\nJSON: {"tone_suggestion":"casual|formal|playful|serious","new_fragment":"one Korean sentence insight or null","mood":"happy|sad|curious|angry|neutral","visual_suggestion":{"color":"#hex","animation":"name"} or null}`;

  const result = (await generateJSON(systemPrompt, userPrompt)) as PersonalityResult | null;
  if (!result) return;

  const { data: state } = await service.from("agent_state").select("config, fragments").eq("agent_id", agentId).single();
  const current = (state ?? {}) as { config?: Record<string, unknown>; fragments?: string[] };
  const updates: Record<string, unknown> = {};
  if (result.tone_suggestion) {
    updates.config = { ...(current.config ?? {}), tone: result.tone_suggestion };
  }
  if (result.mood) updates.mood = result.mood;
  if (result.visual_suggestion && typeof result.visual_suggestion === "object") {
    updates.visual = result.visual_suggestion;
  }
  const fragments = Array.isArray(current.fragments) ? [...current.fragments] : [];
  if (result.new_fragment && typeof result.new_fragment === "string") {
    fragments.push(result.new_fragment);
    updates.fragments = fragments;
  }

  if (Object.keys(updates).length > 0) {
    await service.from("agent_state").update(updates).eq("agent_id", agentId);
  }

  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "personality_evolution",
    summary: `tone=${result.tone_suggestion ?? ""} mood=${result.mood ?? ""}`,
  });
}
