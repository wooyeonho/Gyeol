import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  applyCareDecay,
  createDefaultCareState,
  feedCreature,
  restCreature,
  FEED_COST,
  REST_COST,
  type CareState,
} from "@/lib/creature/care-loop";

async function verifyOwnership(userId: string, agentId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", userId)
    .single();
  return { owned: !!data, service };
}

/**
 * GET /api/care — Get current care state (with decay applied).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owned, service: supabase } = await verifyOwnership(user.id, agentId);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await supabase
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  if (!data) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const config = (data.config ?? {}) as Record<string, unknown>;
  const careState = (config.care_state as CareState | undefined) ?? createDefaultCareState();
  const updated = applyCareDecay(careState);

  // Persist decayed state
  if (updated.lastUpdatedAt !== careState.lastUpdatedAt) {
    await supabase
      .from("agent_state")
      .update({ config: { ...config, care_state: updated } })
      .eq("agent_id", agentId);
  }

  return NextResponse.json({ careState: updated });
}

/**
 * POST /api/care — Feed or rest the creature.
 * Body: { agentId, action: "feed" | "rest" }
 */
export async function POST(req: Request) {
  try {
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { agentId, action } = body as { agentId?: string; action?: string };

    if (!agentId || !action) {
      return NextResponse.json({ error: "agentId and action required" }, { status: 400 });
    }
    if (action !== "feed" && action !== "rest") {
      return NextResponse.json({ error: "action must be 'feed' or 'rest'" }, { status: 400 });
    }

    const { owned, service: supabase } = await verifyOwnership(user.id, agentId);
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data } = await supabase
      .from("agent_state")
      .select("config, coins")
      .eq("agent_id", agentId)
      .single();

    if (!data) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const config = (data.config ?? {}) as Record<string, unknown>;
    const coins = (data.coins as number) ?? 0;
    const careState = (config.care_state as CareState | undefined) ?? createDefaultCareState();
    const decayed = applyCareDecay(careState);

    const cost = action === "feed" ? FEED_COST : REST_COST;
    if (coins < cost) {
      return NextResponse.json({ error: "Not enough coins", required: cost, current: coins }, { status: 402 });
    }

    let newCareState: CareState;
    let dnaNudge: { axis: string; delta: number } | null = null;

    if (action === "feed") {
      const result = feedCreature(decayed);
      newCareState = result.careState;
      dnaNudge = result.dnaNudge;
    } else {
      newCareState = restCreature(decayed);
    }

    // Build updated config with care state
    const updatedConfig: Record<string, unknown> = { ...config, care_state: newCareState };

    // Persist DNA nudge if present
    if (dnaNudge) {
      const genome = (config.genome ?? {}) as Record<string, unknown>;
      const dna = { ...((genome.dna ?? {}) as Record<string, number>) };
      dna[dnaNudge.axis] = Math.max(0, Math.min(1, (dna[dnaNudge.axis] ?? 0.5) + dnaNudge.delta));
      updatedConfig.genome = { ...genome, dna };
    }

    await supabase
      .from("agent_state")
      .update({
        config: updatedConfig,
        coins: coins - cost,
      })
      .eq("agent_id", agentId);

    return NextResponse.json({ careState: newCareState, coinsSpent: cost, dnaNudge });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
