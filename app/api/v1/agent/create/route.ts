import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

function checkApiKey(request: NextRequest): boolean {
  const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-api-key");
  return key === process.env.GYEOL_ENGINE_API_KEY && Boolean(process.env.GYEOL_ENGINE_API_KEY);
}

export async function POST(request: NextRequest) {
  if (!checkApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.user_id === "string" ? body.user_id : null;

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").insert({ user_id: userId }).select("id").single();
    if (!agent?.id) return NextResponse.json({ error: "Create failed" }, { status: 500 });

    await service.from("agent_state").insert({
      agent_id: agent.id,
      total_messages: 0,
      intimacy_score: 0,
      vitality: 1,
      progress: 0,
      gen_level: 1,
      coins: 50,
    });
    return NextResponse.json({ agent_id: agent.id });
  } catch (e) {
    console.error("v1/agent/create POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
