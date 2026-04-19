import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoinsAtomic } from "@/lib/economy/coins";
import { careBodySchema, parseBody } from "@/lib/validation/schemas";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  recordActivity,
  ensureLeagueEnrollment,
  type ActivityResult,
} from "@/lib/engagement/streak-xp";
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
  const genome = (config.genome ?? {}) as Record<string, unknown>;
  const creatureDna = (genome.dna ?? {}) as Record<string, number>;
  const updated = applyCareDecay(careState, creatureDna);

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
export async function POST(req: NextRequest) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`care:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(req, careBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { agentId, action } = parsed.data;

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
    // Extract DNA early so decay and care responses both use the same creature profile
    const genome = (config.genome ?? {}) as Record<string, unknown>;
    const creatureDna = (genome.dna ?? {}) as Record<string, number>;
    const decayed = applyCareDecay(careState, creatureDna);

    const cost = action === "feed" ? FEED_COST : REST_COST;

    // Atomic coin deduction — prevents race condition from concurrent requests
    const spent = await spendCoinsAtomic(agentId, cost, `care:${action}`);
    if (!spent) {
      return NextResponse.json({ error: "Not enough coins", required: cost }, { status: 402 });
    }

    let newCareState: CareState;
    let dnaNudge: { axis: string; delta: number } | null = null;

    if (action === "feed") {
      const result = feedCreature(decayed, creatureDna);
      newCareState = result.careState;
      dnaNudge = result.dnaNudge;
    } else {
      newCareState = restCreature(decayed, creatureDna);
    }

    // Build updated config with care state
    const updatedConfig: Record<string, unknown> = { ...config, care_state: newCareState };

    // Persist DNA nudge if present
    if (dnaNudge) {
      const dna = { ...creatureDna };
      dna[dnaNudge.axis] = Math.max(0, Math.min(1, (dna[dnaNudge.axis] ?? 0.5) + dnaNudge.delta));
      updatedConfig.genome = { ...genome, dna };
    }

    // Coins already deducted atomically above — only persist config changes
    await supabase
      .from("agent_state")
      .update({ config: updatedConfig })
      .eq("agent_id", agentId);

    // Advance streak + award XP + update league placement (non-fatal on failure)
    let engagement: ActivityResult | null = null;
    try {
      await ensureLeagueEnrollment(user.id);
      engagement = await recordActivity(user.id, action === "feed" ? "care:feed" : "care:rest");
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      careState: newCareState,
      coinsSpent: cost,
      dnaNudge,
      engagement,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
