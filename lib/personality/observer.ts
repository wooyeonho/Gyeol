import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export async function analyzeUserPatterns(agentId: string): Promise<void> {
  const service = createServiceClient();
  const now = Date.now();
  const recentStart = new Date(now - SEVEN_DAYS_MS).toISOString();
  const prevStart = new Date(now - 2 * SEVEN_DAYS_MS).toISOString();

  const { data: recentChats } = await service
    .from("chats")
    .select("created_at, content, role")
    .eq("agent_id", agentId)
    .gte("created_at", recentStart);
  const { data: prevChats } = await service
    .from("chats")
    .select("created_at, content, role")
    .eq("agent_id", agentId)
    .gte("created_at", prevStart)
    .lt("created_at", recentStart);

  const recentUser = (recentChats ?? []).filter((c) => (c as { role: string }).role === "user");
  const prevUser = (prevChats ?? []).filter((c) => (c as { role: string }).role === "user");
  const recentCount = recentUser.length;
  const prevCount = prevUser.length;
  const recentAvgLen =
    recentUser.length > 0
      ? recentUser.reduce((s, c) => s + ((c as { content?: string }).content ?? "").length, 0) / recentUser.length
      : 0;
  const prevAvgLen =
    prevUser.length > 0 ? prevUser.reduce((s, c) => s + ((c as { content?: string }).content ?? "").length, 0) / prevUser.length : 0;

  const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  let concern: string | null = null;

  if (prevCount > 0 && recentCount <= prevCount * 0.5) {
    concern = "Lately our talks got shorter. Is everything okay?";
  }
  if (prevAvgLen > 10 && recentAvgLen < prevAvgLen * 0.5) {
    concern = "Your messages feel shorter lately.";
  }

  const recentHours = recentUser.map((c) => new Date((c as { created_at?: string }).created_at ?? 0).getHours());
  const nightOnly = recentHours.length >= 3 && recentHours.every((h) => h >= 0 && h <= 5);
  if (nightOnly) {
    concern = "You only come at night. Are you okay?";
  }

  if (concern) {
    const emb = await generateEmbedding(concern);
    if (emb.length > 0) {
      await service.from("memories").insert({
        agent_id: agentId,
        type: "observation",
        content: concern,
        embedding: emb,
      });
    }
    await service.from("agent_state").update({ config: { ...config, pending_concern: concern } }).eq("agent_id", agentId);
  }
}
