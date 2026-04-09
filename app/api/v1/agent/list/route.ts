import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeV1ApiKey, getApiKeyIdentifier, resolveAuthorizedUserId } from "@/lib/api/v1-auth";
import { recordApiUsage } from "@/lib/analytics/api-usage";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:list");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkRateLimit(`v1-list:${getApiKeyIdentifier(request)}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const userResolution = resolveAuthorizedUserId(auth, request.nextUrl.searchParams.get("user_id"));
  if (userResolution.error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (userResolution.error === "MISSING_TENANT") {
    return NextResponse.json({ error: "API key tenant binding required" }, { status: 403 });
  }
  if (userResolution.error === "MISSING_USER_ID" || !userResolution.userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const { data: agents } = await service
      .from("agents")
      .select("id, created_at")
      .eq("user_id", userResolution.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (agents ?? []).map((a) => ({
      agent_id: (a as { id: string }).id,
      created_at: (a as { created_at?: string }).created_at,
    }));

    recordApiUsage("v1:agent:list", getApiKeyIdentifier(request), { user_id: userResolution.userId });
    return NextResponse.json({ agents: list });
  } catch (e) {
    logger.error("v1/agent/list GET", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
