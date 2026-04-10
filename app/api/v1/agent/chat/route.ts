import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { authorizeV1ApiKey, canAccessAgent, getApiKeyIdentifier } from "@/lib/api/v1-auth";
import { parseBody } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";
import { runSynchronousChatTurn } from "@/lib/chat/sync-turn";
import { logger } from "@/lib/logger";
import { z } from "zod";

const v1AgentChatBodySchema = z.object({
  agent_id: z.string().uuid("Invalid agent_id"),
  message: z.string().min(1, "message required").max(8000),
});

export async function POST(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:chat");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const allowed = await checkRateLimit(`v1-chat:${getApiKeyIdentifier(request)}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(request, v1AgentChatBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const agentId = parsed.data.agent_id;
    const rawMessage = parsed.data.message;
    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return NextResponse.json({ error: fence.reason || "Blocked" }, { status: 400 });
    const message = sanitizeUserInput(rawMessage);

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id, user_id").eq("id", agentId).maybeSingle();
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (!canAccessAgent(auth, (agent as { user_id?: string | null }).user_id ?? null)) {
      const error = auth.ownerUserId ? "Forbidden" : "API key tenant binding required";
      return NextResponse.json({ error }, { status: 403 });
    }
    const result = await runSynchronousChatTurn({
      agentId,
      message,
      service,
    });
    if (!result) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    return NextResponse.json({ reply: result.reply || "..." });
  } catch (e) {
    logger.error("v1/agent/chat POST", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
