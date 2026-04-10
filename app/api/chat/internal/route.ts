import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { NextRequest, NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";
import { logRouteError } from "@/lib/ops/logger";
import { runSynchronousChatTurn } from "@/lib/chat/sync-turn";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { z } from "zod";

const internalChatBodySchema = z.object({
  agent_id: z.string().uuid("Invalid agent_id format"),
  message: z.string().min(1, "message required").max(8000),
});

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
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
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = internalChatBodySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const agentId = parsed.data.agent_id;
    const rawMessage = parsed.data.message;
    const allowed = await checkRateLimit(`internal-chat:${agentId}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return NextResponse.json({ error: fence.reason || "Blocked" }, { status: 400 });
    const message = sanitizeUserInput(rawMessage);
    const sanitizedFence = checkElectricFence(message);
    if (sanitizedFence.blocked) return NextResponse.json({ error: sanitizedFence.reason || "Blocked" }, { status: 400 });

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
