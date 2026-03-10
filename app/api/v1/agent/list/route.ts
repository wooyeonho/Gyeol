import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getApiKeyIdentifier, verifyV1ApiKey } from "@/lib/api/v1-auth";
import { recordApiUsage } from "@/lib/analytics/api-usage";

export async function GET(request: NextRequest) {
  if (!(await verifyV1ApiKey(request, "v1:agent:list"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkRateLimit(`v1-list:${getApiKeyIdentifier(request)}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  try {
    const service = createServiceClient();
    const { data: agents } = await service
      .from("agents")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (agents ?? []).map((a) => ({
      agent_id: (a as { id: string }).id,
      created_at: (a as { created_at?: string }).created_at,
    }));

    recordApiUsage("v1:agent:list", getApiKeyIdentifier(request), { user_id: userId });
    return NextResponse.json({ agents: list });
  } catch (e) {
    console.error("v1/agent/list GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
