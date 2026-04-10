import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeV1ApiKey, canAccessAgent, getApiKeyIdentifier } from "@/lib/api/v1-auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:state");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkRateLimit(`v1-state:${getApiKeyIdentifier(request)}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const agentId = request.nextUrl.searchParams.get("agent_id");
  if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });

  try {
    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id, user_id").eq("id", agentId).maybeSingle();
    const ownerUserId = (agent as { user_id?: string | null } | null)?.user_id ?? null;
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (!canAccessAgent(auth, ownerUserId)) {
      const error = auth.ownerUserId ? "Forbidden" : "API key tenant binding required";
      return NextResponse.json({ error }, { status: 403 });
    }
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    if (!state) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ agentState: state });
  } catch (e) {
    logger.error("v1/agent/state GET", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
