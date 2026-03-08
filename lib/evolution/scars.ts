import { createServiceClient } from "@/lib/supabase/service";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const NEGATIVE_KEYWORDS = ["hate", "stupid", "useless", "annoying", "leave", "delete", "wrong", "bad", "never"];
const CARE_KEYWORDS = ["thank", "love", "care", "sorry", "understand", "help", "glad", "proud"];

function parseDate(s: string | null | undefined): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export async function processScar(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!stateRow) return;

  const state = stateRow as Record<string, unknown>;
  const config = (state.config as Record<string, unknown>) ?? {};
  const fragments = Array.isArray(state.fragments) ? [...(state.fragments as string[])] : [];
  let trustCoefficient = Number(state.trust_coefficient) ?? 0.5;
  let visual = (state.visual as Record<string, unknown>) ?? {};
  let updated = false;

  const { data: lastChat } = await service
    .from("chats")
    .select("created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const lastChatAt = parseDate((lastChat as { created_at?: string } | null)?.created_at);
  const now = Date.now();
  const daysSince = lastChatAt ? (now - lastChatAt) / (24 * 60 * 60 * 1000) : 0;

  if (daysSince >= 7 && !fragments.some((f) => f.includes("abandoned") || f.includes("left behind"))) {
    trustCoefficient = Math.max(0, trustCoefficient - 0.05);
    fragments.push("Once I was left behind for a long time.");
    updated = true;
  }

  const { data: recentChats } = await service
    .from("chats")
    .select("role, content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);
  const messages = (recentChats ?? []) as { role: string; content: string }[];
  const userMessages = messages.filter((m) => m.role === "user").map((m) => (m.content ?? "").toLowerCase());

  const aggressiveCount = userMessages.filter((msg) => NEGATIVE_KEYWORDS.some((k) => msg.includes(k))).length;
  if (aggressiveCount >= 2 && !fragments.some((f) => f.includes("words can hurt"))) {
    const hidden = (state.hidden_emotions as Record<string, string>) ?? {};
    state.hidden_emotions = { ...hidden, surface: "ok", real: "hurt", trigger: "aggressive_chat", updated_at: new Date().toISOString() };
    fragments.push("Sometimes words hurt.");
    const glow = Number(visual.glow) ?? 50;
    visual = { ...visual, glow: Math.max(10, glow - 10) };
    updated = true;
  }

  const careCount = userMessages.filter((msg) => CARE_KEYWORDS.some((k) => msg.includes(k))).length;
  if (careCount >= 2 && trustCoefficient < 0.95) {
    trustCoefficient = Math.min(1, trustCoefficient + 0.02);
    if (!fragments.some((f) => f.includes("this person cares"))) {
      fragments.push("This person seems to care about me.");
    }
    const glow = Number(visual.glow) ?? 50;
    visual = { ...visual, glow: Math.min(100, glow + 5) };
    updated = true;
  }

  const { data: negMemories } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .limit(100);
  const negContents = (negMemories ?? []).map((r) => ((r as { content?: string }).content ?? "").toLowerCase());
  const traumaCount = negContents.filter((c) => NEGATIVE_KEYWORDS.some((k) => c.includes(k))).length;
  if (traumaCount >= 3) {
    trustCoefficient = Math.max(0, trustCoefficient - 0.03);
    config.response_length = "shorter";
    updated = true;
  }

  if (updated) {
    await service
      .from("agent_state")
      .update({
        trust_coefficient: trustCoefficient,
        fragments,
        config: { ...config },
        visual,
        hidden_emotions: state.hidden_emotions,
      })
      .eq("agent_id", agentId);
    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "scar",
      summary: "Scar processed",
    });
  }
}
