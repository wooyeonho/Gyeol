import { createServiceClient } from "@/lib/supabase/service";

function avgLength(texts: string[]): number {
  if (texts.length === 0) return 0;
  return texts.reduce((sum, t) => sum + t.length, 0) / texts.length;
}

export async function detectSpeechShift(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("chats")
    .select("content, created_at")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(120);
  if (!rows || rows.length < 20) return;

  const recent = rows.slice(0, 20).map((r) => String(r.content ?? ""));
  const previous = rows.slice(20, 40).map((r) => String(r.content ?? ""));
  if (previous.length < 10) return;

  const recentAvg = avgLength(recent);
  const prevAvg = avgLength(previous);
  const formalRecent = recent.filter((t) => /습니다|세요|이에요|예요/.test(t)).length / recent.length;
  const formalPrev = previous.filter((t) => /습니다|세요|이에요|예요/.test(t)).length / previous.length;

  let observation: string | null = null;
  if (Math.abs(formalRecent - formalPrev) > 0.25) {
    observation = formalRecent > formalPrev
      ? "오늘 말투가 더 조심스러워졌어요."
      : "오늘 말투가 더 편해졌어요.";
  } else if (recentAvg > prevAvg * 1.3) {
    observation = "요즘 말이 길어져서 마음을 더 열고 있는 것 같아요.";
  } else if (recentAvg < prevAvg * 0.7) {
    observation = "요즘 말이 짧아져서 조금 조심스러워 보여요.";
  }
  if (!observation) return;

  const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((state?.config as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_question: observation },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "speech_shift",
    summary: observation,
  });
}
import { generateJSON } from "@/lib/ai/router";

/**
 * G6: Detect speech pattern changes (formal/informal, length, emoji).
 * "You suddenly started using formal speech. Why?"
 */
export async function analyzeSpeechPatterns(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: chats } = await service
    .from("chats")
    .select("role, content, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(60);
  const userChats = (chats ?? []).filter((c) => (c as { role: string }).role === "user") as { content?: string; created_at?: string }[];
  if (userChats.length < 20) return;

  const recent = userChats.slice(0, 15).map((c) => (c.content ?? "").slice(0, 200)).join("\n");
  const older = userChats.slice(15, 30).map((c) => (c.content ?? "").slice(0, 200)).join("\n");
  const raw = (await generateJSON(
    "Compare recent vs older user messages. Detect: formal/informal switch, sentence length change, emoji change. One short observation in Korean or null.",
    `Recent:\n${recent}\n\nOlder:\n${older}\n\nJSON: {"change_detected":bool,"observation":"one sentence or null"}`,
  )) as { change_detected?: boolean; observation?: string } | null;
  if (!raw?.change_detected || !raw.observation) return;

  const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_question: raw.observation.slice(0, 300) },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "speech_analysis",
    summary: "Speech pattern change detected.",
  });
}
