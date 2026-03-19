import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { NextRequest, NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";
import { logRouteError } from "@/lib/ops/logger";
import { runSynchronousChatTurn } from "@/lib/chat/sync-turn";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Service unavailable: missing CRON_SECRET", code: "MISSING_ENV" },
      { status: 503 }
    );
  }
  if (CRON_SECRET && req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const agentId = body.agent_id as string | undefined;
    const message = typeof body.message === "string" ? sanitizeUserInput(body.message) : "";
    if (!agentId || !message) {
      return NextResponse.json({ error: "agent_id and message required" }, { status: 400 });
    }
    const allowed = await checkRateLimit(`internal-chat:${agentId}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const fence = checkElectricFence(message);
    if (fence.blocked) return NextResponse.json({ error: fence.reason || "Blocked" }, { status: 400 });

    const service = createServiceClient();
    const result = await runSynchronousChatTurn({
      agentId,
      message,
      service,
    });
    if (!result) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    return NextResponse.json({ reply: result.reply || "..." });
  } catch (e) {
    logRouteError("Chat internal error", e);
    if (isMissingEnvError(e)) {
      return NextResponse.json(
        { error: "Service unavailable: missing server configuration", code: "MISSING_ENV" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
