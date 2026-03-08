import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function analyzePersonality(agentId: string) {
  const db = createServiceClient();
  const { data: chats } = await db.from("chats").select("content").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(10);
  if (!chats || chats.length < 5) return;

  const convos = chats.map((c) => c.content).join("\n");
  const result = await generateJSON(
    "Analyze conversations. Respond ONLY with valid JSON. No explanation.",
    `Conversations:\n${convos}\n\nJSON: {"tone_suggestion":"casual|formal|playful|serious","new_fragment":"one Korean sentence insight or null","mood":"happy|sad|curious|angry|neutral","visual_suggestion":{"color":"#hex","animation":"float|pulse-fast|breathe-slow"}|null}`
  );
  if (!result) return;

  const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!state) return;

  const updates: any = {};
  if (result.tone_suggestion) updates.config = { ...state.config, tone: result.tone_suggestion };
  if (result.mood) updates.mood = result.mood;
  if (result.new_fragment && result.new_fragment !== "null") {
    const fragments = [...(state.fragments || []), result.new_fragment].slice(-20);
    updates.fragments = fragments;
  }
  if (result.visual_suggestion) updates.visual = { ...state.visual, ...result.visual_suggestion };

  await db.from("agent_state").update(updates).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "personality_evolution", summary: JSON.stringify(result) });
}
