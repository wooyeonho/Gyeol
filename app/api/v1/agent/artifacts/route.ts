import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeV1ApiKey, canAccessAgent, getApiKeyIdentifier } from "@/lib/api/v1-auth";
import { recordApiUsage } from "@/lib/analytics/api-usage";

export async function GET(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:artifacts");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkRateLimit(`v1-artifacts:${getApiKeyIdentifier(request)}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const agentId = request.nextUrl.searchParams.get("agent_id");
  if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10), 100);

  try {
    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id, user_id").eq("id", agentId).maybeSingle();
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (!canAccessAgent(auth, (agent as { user_id?: string | null }).user_id ?? null)) {
      const error = auth.ownerUserId ? "Forbidden" : "API key tenant binding required";
      return NextResponse.json({ error }, { status: 403 });
    }
    const { data: rows } = await service
      .from("artifacts")
      .select("id, type, title, content, created_at, expires_at, is_preserved, is_public")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const artifacts = (rows ?? []).map((r) => ({
      id: (r as { id: string }).id,
      type: (r as { type?: string }).type,
      title: (r as { title?: string }).title,
      content: (r as { content?: string })?.content?.slice(0, 500),
      created_at: (r as { created_at?: string }).created_at,
      expires_at: (r as { expires_at?: string | null }).expires_at,
      is_preserved: (r as { is_preserved?: boolean }).is_preserved,
      is_public: (r as { is_public?: boolean }).is_public,
    }));

    recordApiUsage("v1:agent:artifacts", getApiKeyIdentifier(request), { agent_id: agentId });
    return NextResponse.json({ artifacts });
  } catch (e) {
    console.error("v1/agent/artifacts GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
