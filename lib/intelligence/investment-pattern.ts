import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

const INVESTMENT_KEYWORDS = /invest|stock|buy|sell|market|portfolio|trade|fund|asset|loss|profit|panic|fomo|crash|bull|bear|buy the dip|margin/i;

/**
 * H12: Detect investment behavior pattern from memories. Not advice - "You always did X in this situation."
 */
export async function analyzeInvestmentPattern(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: mems } = await service
    .from("memories")
    .select("content, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(200);
  const investmentRelated = (mems ?? []).filter((m) =>
    INVESTMENT_KEYWORDS.test((m as { content?: string }).content ?? "")
  ) as { content?: string; created_at?: string }[];
  if (investmentRelated.length < 3) return;

  const content = investmentRelated.map((m) => m.content ?? "").join("\n").slice(0, 2500);
  const raw = (await generateJSON(
    "From user's past mentions of investing/trading, identify one behavioral pattern (e.g. impulsive buys on Friday night, fear selling in downturns). One short sentence. No advice. Korean or English.",
    `Mentions:\n${content}\n\nJSON: {"pattern":"one sentence describing tendency or null"}`,
  )) as { pattern?: string } | null;
  if (!raw?.pattern) return;

  const { data: stateRow } = await service.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow as { self_model?: { observations?: string[] } })?.self_model ?? {};
  const observations = selfModel.observations ?? [];
  const line = `Investment pattern: ${raw.pattern.slice(0, 200)}`;
  if (observations.some((o) => o.includes("Investment pattern"))) return;
  await service.from("agent_state").update({
    self_model: { ...selfModel, observations: [...observations.slice(-9), line] },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "investment_pattern",
    summary: "Pattern noted (not advice).",
  });
}
