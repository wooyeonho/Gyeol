import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { parseBody } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { DailyChallengeState } from "@/lib/engagement/daily-challenge";

const challengeStateBodySchema = z.object({
  state: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    challenges: z.array(z.object({
      id: z.string().max(50),
      difficulty: z.enum(["easy", "medium", "hard"]),
      progress: z.number().min(0).max(100),
      target: z.number().min(1).max(100),
      completed: z.boolean(),
    })).max(3),
    perfectDayClaimed: z.boolean(),
  }),
});

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
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`challenges:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(req, challengeStateBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const sanitized: DailyChallengeState = parsed.data.state;

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
