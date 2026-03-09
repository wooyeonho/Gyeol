import { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";

type AgentRow = {
  user_id: string;
  id: string;
};

type StateRow = {
  agent_id: string;
  config?: Record<string, unknown> | null;
  total_messages?: number | null;
  last_dream_at?: string | null;
};

function buildProposal(state: StateRow): {
  proposal_type: string;
  title: string;
  risk_level: "low" | "medium";
  plan: Record<string, unknown>;
} | null {
  const config = (state.config ?? {}) as Record<string, unknown>;
  const dreamEnabled = config.dream_enabled === true;
  const socialEnabled = config.social_enabled !== false;
  const recallCount = typeof config.recall_count === "number" ? config.recall_count : 5;
  const now = Date.now();
  const staleDream = !state.last_dream_at || now - new Date(state.last_dream_at).getTime() > 36 * 3600000;

  if (!dreamEnabled) {
    return {
      proposal_type: "enable_dream",
      title: "드림 엔진 활성화 제안",
      risk_level: "low",
      plan: { config_patch: { dream_enabled: true }, note: "내면 회고 루프를 다시 켭니다." },
    };
  }
  if (!socialEnabled && (state.total_messages ?? 0) > 20) {
    return {
      proposal_type: "enable_social",
      title: "소셜 루프 활성화 제안",
      risk_level: "low",
      plan: { config_patch: { social_enabled: true }, note: "관계 기반 학습을 위해 소셜 루프를 켭니다." },
    };
  }
  if (staleDream && recallCount < 8) {
    return {
      proposal_type: "raise_recall",
      title: "회상 강도 증가 제안",
      risk_level: "medium",
      plan: { config_patch: { recall_count: recallCount + 1 }, note: "최근 꿈 루프가 약해 회상 강도를 보정합니다." },
    };
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lockKey = "cron:autonomy";
  const acquired = await acquireCronLock(lockKey, 300);
  if (!acquired) {
    return new Response(JSON.stringify({ processed: 0, skipped: "lock" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createServiceClient();
    const [{ data: agents }, { data: states }, { data: recent }] = await Promise.all([
      service.from("agents").select("id, user_id"),
      service.from("agent_state").select("agent_id, config, total_messages, last_dream_at"),
      service
        .from("autonomy_proposals")
        .select("agent_id, proposal_type, status, created_at")
        .in("status", ["pending", "approved"])
        .gte("created_at", new Date(Date.now() - 72 * 3600000).toISOString()),
    ]);

    const agentRows = (agents ?? []) as AgentRow[];
    const stateRows = (states ?? []) as StateRow[];
    const recentRows = (recent ?? []) as Array<{ agent_id: string; proposal_type: string }>;
    const stateMap = new Map<string, StateRow>(stateRows.map((row) => [row.agent_id, row]));
    const dedupe = new Set<string>(recentRows.map((row) => `${row.agent_id}:${row.proposal_type}`));

    let proposed = 0;
    for (const agent of agentRows) {
      const state = stateMap.get(agent.id);
      if (!state) continue;
      const config = (state.config ?? {}) as Record<string, unknown>;
      if (config.autonomous_enabled === false) continue;
      if (config.autonomy_proposals_enabled === false) continue;

      const next = buildProposal(state);
      if (!next) continue;
      const dedupeKey = `${agent.id}:${next.proposal_type}`;
      if (dedupe.has(dedupeKey)) continue;

      const { data: inserted } = await service
        .from("autonomy_proposals")
        .insert({
          user_id: agent.user_id,
          agent_id: agent.id,
          title: next.title,
          proposal_type: next.proposal_type,
          risk_level: next.risk_level,
          created_by: "ai",
          status: "pending",
          plan: next.plan,
        })
        .select("id")
        .single();

      await service.from("autonomy_action_logs").insert({
        proposal_id: inserted?.id ?? null,
        user_id: agent.user_id,
        agent_id: agent.id,
        action: "proposed",
        detail: next.title,
        payload: { proposal_type: next.proposal_type, source: "cron:autonomy" },
      });
      dedupe.add(dedupeKey);
      proposed++;
    }

    return new Response(
      JSON.stringify({ processed: proposed, timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cron/autonomy GET", e);
    return new Response(
      JSON.stringify({ error: "Autonomy proposal loop failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    await releaseCronLock(lockKey);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
