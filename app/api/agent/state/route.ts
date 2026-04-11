import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { generateInitialDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { getLatestSubscription } from "@/lib/billing/service";
import { getEngagementState } from "@/lib/engagement/streak-xp";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/agent/state" });

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const service = createServiceClient();
    const { agentId, hasMultiple } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ agentId: null, agentState: null });
    }
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();

    // Backfill genome for pre-existing agents that were created before DNA system
    const stateRow = state as Record<string, unknown> | null;
    if (stateRow && !stateRow.genome) {
      const initialDNA = generateInitialDNA(agentId);
      const initialSpecies = deriveSpecies(initialDNA);
      const genome = { dna: initialDNA, species: initialSpecies.name, archetype: initialSpecies.archetype, element: initialSpecies.element };
      await service.from("agent_state").update({ genome }).eq("agent_id", agentId);
      stateRow.genome = genome;
      log.warn(`[AgentState] Backfilled genome for agent ${agentId}`);
    }

    // Include billing plan tier so the reward system can apply plan multipliers
    let planTier: string = "free";
    try {
      const sub = await getLatestSubscription(service, user.id);
      if (sub?.plan_tier === "pro" || sub?.plan_tier === "premium") {
        planTier = sub.plan_tier;
      }
    } catch {
      // Non-fatal — default to free
    }

    // Merge engagement state (streak + XP) into agent state so clients get the
    // real streak_days instead of the stale schema column default.
    let engagement: Awaited<ReturnType<typeof getEngagementState>> | null = null;
    try {
      engagement = await getEngagementState(user.id);
    } catch {
      // Non-fatal
    }

    const mergedState =
      state && engagement
        ? { ...(state as Record<string, unknown>), streak_days: engagement.currentStreak }
        : state;

    return NextResponse.json({
      agentId,
      agentState: mergedState ?? null,
      hasMultipleAgents: hasMultiple,
      planTier,
      engagement,
    });
  } catch (e) {
    log.error("GET /api/agent/state error", e instanceof Error ? e : { detail: String(e) });
    if (isMissingEnvError(e)) {
      return NextResponse.json(
        {
          agentId: "demo-agent",
          agentState: getDemoAgentState(),
          hasMultipleAgents: false,
          demo_mode: true,
        }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
