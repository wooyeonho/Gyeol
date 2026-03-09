import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { applySafePlan, sanitizeSafePlan } from "@/lib/autonomy/safe-evolution";

type AgentStateRow = {
  config?: Record<string, unknown> | null;
  self_model?: Record<string, unknown> | null;
};

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = await checkRateLimit(`autonomy-execute:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: state } = await service
      .from("agent_state")
      .select("config, self_model")
      .eq("agent_id", agentId)
      .single();

    const currentState = (state ?? {}) as AgentStateRow;
    const baseConfig = (currentState.config ?? {}) as Record<string, unknown>;
    const executionEnabled = baseConfig.autonomy_execute_enabled === true;
    if (!executionEnabled) {
      await service.from("autonomy_action_logs").insert({
        user_id: user.id,
        agent_id: agentId,
        action: "blocked",
        detail: "Autonomy execution blocked by kill switch",
        payload: { reason: "autonomy_execute_enabled_false" },
      });
      return NextResponse.json({ error: "Autonomy execution is OFF (kill switch)." }, { status: 403 });
    }
    if (baseConfig.autonomous_enabled === false) {
      return NextResponse.json({ error: "Autonomous mode is OFF" }, { status: 403 });
    }

    const { data: proposals } = await service
      .from("autonomy_proposals")
      .select("id, title, plan")
      .eq("user_id", user.id)
      .eq("agent_id", agentId)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(10);

    if (!proposals?.length) return NextResponse.json({ ok: true, processed: 0, results: [] });

    let mutableConfig = { ...(currentState.config ?? {}) } as Record<string, unknown>;
    let mutableSelfModel = { ...(currentState.self_model ?? {}) } as Record<string, unknown>;
    let processed = 0;
    const results: Array<{ id: string; executed: boolean; applied_keys: string[] }> = [];

    for (const proposal of proposals) {
      const safePlan = sanitizeSafePlan(proposal.plan);
      const applied = applySafePlan(mutableConfig, mutableSelfModel, safePlan);
      if (!applied.changed) {
        await service.from("autonomy_proposals").update({
          status: "executed",
          executed_at: new Date().toISOString(),
          execution_result: { executed: false, reason: "no_safe_changes" },
        }).eq("id", proposal.id);
        await service.from("autonomy_action_logs").insert({
          proposal_id: proposal.id,
          user_id: user.id,
          agent_id: agentId,
          action: "executed",
          detail: `${proposal.title} (no safe changes)`,
          payload: { applied_keys: [] },
        });
        results.push({ id: proposal.id, executed: false, applied_keys: [] });
        processed++;
        continue;
      }

      mutableConfig = applied.nextConfig;
      mutableSelfModel = applied.nextSelfModel;
      await service.from("agent_state").update({
        config: mutableConfig,
        self_model: mutableSelfModel,
      }).eq("agent_id", agentId);

      await service.from("autonomy_proposals").update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: { executed: true, applied_keys: applied.appliedKeys },
      }).eq("id", proposal.id);

      await service.from("autonomy_action_logs").insert({
        proposal_id: proposal.id,
        user_id: user.id,
        agent_id: agentId,
        action: "executed",
        detail: proposal.title,
        payload: { applied_keys: applied.appliedKeys },
      });

      results.push({ id: proposal.id, executed: true, applied_keys: applied.appliedKeys });
      processed++;
    }

    return NextResponse.json({ ok: true, processed, results });
  } catch (e) {
    console.error("autonomy/execute POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
