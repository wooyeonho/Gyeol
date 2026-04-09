import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { DailyChallengeState } from "@/lib/engagement/daily-challenge";

const log = logger.child({ route: "api/challenges" });

/**
 * GET /api/challenges — Retrieve persisted challenge state from server.
 * Falls back to null if no state saved yet (client initializes locally).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ state: null });

    const { data: stateRow } = await service
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();

    const config = (stateRow?.config as Record<string, unknown> | undefined) ?? {};
    const challengeState = (config.daily_challenges as DailyChallengeState | undefined) ?? null;

    return NextResponse.json({ state: challengeState });
  } catch (e) {
    log.error("GET failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/challenges — Sync client challenge state to server.
 * Called when user completes a challenge or claims perfect day bonus.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`challenges:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const state = body?.state as DailyChallengeState | undefined;
    if (!state || !state.date || !Array.isArray(state.challenges)) {
      return NextResponse.json({ error: "Invalid challenge state" }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Sanitize: only persist expected fields
    const sanitized: DailyChallengeState = {
      date: state.date,
      challenges: state.challenges.slice(0, 3).map((c) => ({
        id: typeof c.id === "string" ? c.id.slice(0, 50) : "",
        difficulty: (["easy", "medium", "hard"] as const).includes(c.difficulty) ? c.difficulty : "easy",
        progress: Math.max(0, Math.min(100, Number(c.progress) || 0)),
        target: Math.max(1, Math.min(100, Number(c.target) || 1)),
        completed: Boolean(c.completed),
      })),
      perfectDayClaimed: Boolean(state.perfectDayClaimed),
    };

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    // Merge into existing config
    const { data: existing } = await service
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();

    const config = (existing?.config as Record<string, unknown> | undefined) ?? {};
    const updatedConfig = { ...config, daily_challenges: sanitized };

    await service
      .from("agent_state")
      .update({ config: updatedConfig })
      .eq("agent_id", agentId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
