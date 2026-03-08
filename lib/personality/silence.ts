import { createServiceClient } from "@/lib/supabase/service";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export async function detectSilence(agentId: string): Promise<void> {
  const service = createServiceClient();
  const now = Date.now();
  const threeDaysAgo = new Date(now - THREE_DAYS_MS).toISOString();

  const { data: recentSessions } = await service
    .from("chats")
    .select("created_at, role")
    .eq("agent_id", agentId)
    .gte("created_at", threeDaysAgo)
    .order("created_at", { ascending: false });

  const rows = (recentSessions ?? []) as { created_at?: string; role?: string }[];
  const uniqueDays = new Set(rows.map((r) => r.created_at?.slice(0, 10)).filter(Boolean));
  const userMessages = rows.filter((r) => r.role === "user").length;

  if (uniqueDays.size >= 2 && userMessages === 0) {
    const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
    const question = "You opened the app but did not say anything. Is everything okay?";
    await service.from("agent_state").update({ config: { ...config, pending_question: question } }).eq("agent_id", agentId);
  }
}

export async function recordTypingEvent(agentId: string, event: "blur" | "view_only", hadContent: boolean): Promise<void> {
  const service = createServiceClient();
  if (event === "blur" && !hadContent) {
    const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
    const question = "Just wanted to look? That is okay.";
    await service.from("agent_state").update({ config: { ...config, pending_question: question } }).eq("agent_id", agentId);
  }
}

export async function recordVisitNoMessage(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  const question = "Something seems on your mind. You do not have to talk if you do not want to.";
  await service.from("agent_state").update({ config: { ...config, pending_question: question } }).eq("agent_id", agentId);
}
