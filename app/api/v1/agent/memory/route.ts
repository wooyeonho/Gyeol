import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
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
    const agentId = typeof body?.agent_id === "string" ? body.agent_id : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "conversation";
    if (!agentId || !content) {
      return NextResponse.json({ error: "agent_id and content required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agent } = await service.from("agent_state").select("agent_id").eq("agent_id", agentId).single();
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const embedding = await generateEmbedding(content);
    if (embedding.length === 0) return NextResponse.json({ error: "Embedding failed" }, { status: 500 });

    await service.from("memories").insert({
      agent_id: agentId,
      type,
      content,
      embedding,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("v1/agent/memory POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
