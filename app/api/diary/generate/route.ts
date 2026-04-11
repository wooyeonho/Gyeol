import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maybeWriteDailyDiary } from "@/lib/diary/auto-generate";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/diary/generate" });

/**
 * POST /api/diary/generate
 *
 * Phase 2-1 follow-up: manual diary generation trigger.
 *
 * The daily cron covers the 99% case where the creature writes its own
 * diary overnight, but if a user explicitly wants "today's diary now"
 * (e.g. they just logged in and want to read it before cron fires) this
 * lets them request one on demand. Idempotent — if an entry already
 * exists the helper returns null and we surface that as `skipped=true`.
 *
 * Rate-limited per user so this can't be used to hammer the LLM.
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await createServerSupabase();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`diary-generate:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const service = createServiceClient();
  const { data: agent } = await service
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!agent?.id) {
    return NextResponse.json({ error: "No agent" }, { status: 404 });
  }

  try {
    const insertedId = await maybeWriteDailyDiary(agent.id);
    if (!insertedId) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    return NextResponse.json({ ok: true, skipped: false, entry_id: insertedId });
  } catch (e) {
    log.error("manual diary generation failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
