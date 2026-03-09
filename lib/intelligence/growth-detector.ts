import { createServiceClient } from "@/lib/supabase/service";

export async function detectGrowthSignals(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("chats")
    .select("content, created_at")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(240);
  if (!rows || rows.length < 80) return;

  const recent = rows.slice(0, 40).map((r) => String(r.content ?? ""));
  const old = rows.slice(120, 160).map((r) => String(r.content ?? ""));
  if (old.length < 20) return;

  const countRecentPositiveAction = recent.filter((t) => /해볼게|해보자|시도|도전|실행|가능/.test(t)).length;
  const countOldPositiveAction = old.filter((t) => /해볼게|해보자|시도|도전|실행|가능/.test(t)).length;
  const countRecentHesitation = recent.filter((t) => /모르겠|못하겠|불안|포기/.test(t)).length;
  const countOldHesitation = old.filter((t) => /모르겠|못하겠|불안|포기/.test(t)).length;

  const actionUp = countRecentPositiveAction > countOldPositiveAction + 4;
  const hesitationDown = countRecentHesitation + 3 < countOldHesitation;
  if (!actionUp && !hesitationDown) return;

  const growthLine = actionUp && hesitationDown
    ? "최근에는 망설임이 줄고 실행 의지가 뚜렷해졌어요."
    : actionUp
      ? "최근에는 시도/실행 표현이 늘었어요."
      : "최근에는 불안/주저 표현이 줄어들었어요.";

  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "growth_signal",
    summary: growthLine,
  });

  const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((state?.config as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_concern: growthLine },
  }).eq("agent_id", agentId);
}
import { generateJSON } from "@/lib/ai/router";

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * G7: Compare 3 months ago vs now - "Decisions got faster.", "Less 'I don\'t know', more 'I\'ll try'."
 */
export async function detectGrowth(agentId: string): Promise<void> {
  const service = createServiceClient();
  const now = Date.now();
  const threeMonthsAgo = new Date(now - THREE_MONTHS_MS).toISOString();
  const twoMonthsAgo = new Date(now - (60 * 24 * 60 * 60 * 1000)).toISOString();

  const { data: recentChats } = await service
    .from("chats")
    .select("content, role")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .gte("created_at", twoMonthsAgo)
    .limit(50);
  const { data: oldChats } = await service
    .from("chats")
    .select("content, role")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .gte("created_at", threeMonthsAgo)
    .lt("created_at", twoMonthsAgo)
    .limit(50);
  const recentText = (recentChats ?? []).map((c) => (c as { content?: string }).content ?? "").join("\n").slice(0, 2000);
  const oldText = (oldChats ?? []).map((c) => (c as { content?: string }).content ?? "").join("\n").slice(0, 2000);
  if (recentText.length < 100 || oldText.length < 100) return;

  const raw = (await generateJSON(
    "Compare old vs recent user messages. Note: faster decisions, more positive phrasing, richer emotion, less hesitation. One short growth observation in Korean or null.",
    `Old (3mo ago):\n${oldText}\n\nRecent:\n${recentText}\n\nJSON: {"growth_observed":bool,"observation":"one sentence or null"}`,
  )) as { growth_observed?: boolean; observation?: string } | null;
  if (!raw?.growth_observed || !raw.observation) return;

  const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_question: raw.observation.slice(0, 300) },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "growth_detected",
    summary: "Invisible growth observed.",
  });
}
