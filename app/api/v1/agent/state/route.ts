import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

function checkApiKey(request: NextRequest): boolean {
  const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-api-key");
  return key === process.env.GYEOL_ENGINE_API_KEY && Boolean(process.env.GYEOL_ENGINE_API_KEY);
}

export async function GET(request: NextRequest) {
  if (!checkApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agentId = request.nextUrl.searchParams.get("agent_id");
  if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });

  try {
    const service = createServiceClient();
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    if (!state) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ agentState: state });
  } catch (e) {
    console.error("v1/agent/state GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
