import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeV1ApiKey, getApiKeyIdentifier, resolveAuthorizedUserId } from "@/lib/api/v1-auth";
import { parseBody } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const v1AgentCreateBodySchema = z.object({
  user_id: z.string().uuid("Invalid user_id").optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:create");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const allowed = await checkRateLimit(`v1-create:${getApiKeyIdentifier(request)}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(request, v1AgentCreateBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const userId = parsed.data.user_id?.trim() ?? null;
    const userResolution = resolveAuthorizedUserId(auth, userId);
    if (userResolution.error === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (userResolution.error === "MISSING_TENANT") {
      return NextResponse.json({ error: "API key tenant binding required" }, { status: 403 });
    }
    if (userResolution.error === "MISSING_USER_ID" || !userResolution.userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").insert({ user_id: userResolution.userId }).select("id").single();
    if (!agent?.id) return NextResponse.json({ error: "Create failed" }, { status: 500 });

    await service.from("agent_state").insert({
      agent_id: agent.id,
      config: {
        autonomous_enabled: true,
        dream_enabled: true,
        social_enabled: true,
      },
      total_messages: 0,
      intimacy_score: 0,
      vitality: 1,
      progress: 0,
      gen_level: 1,
      coins: 50,
    });
    return NextResponse.json({ agent_id: agent.id });
  } catch (e) {
    logger.error("v1/agent/create POST", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
