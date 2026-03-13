import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { authorizeV1ApiKey, canAccessAgent, getApiKeyIdentifier } from "@/lib/api/v1-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:memory");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const allowed = await checkRateLimit(`v1-memory:${getApiKeyIdentifier(request)}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const agentId = typeof body?.agent_id === "string" ? body.agent_id : "";
    const content = typeof body?.content === "string" ? sanitizeUserInput(body.content) : "";
    const type = typeof body?.type === "string" ? body.type : "conversation";
    if (!agentId || !content) {
      return NextResponse.json({ error: "agent_id and content required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id, user_id").eq("id", agentId).maybeSingle();
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (!canAccessAgent(auth, (agent as { user_id?: string | null }).user_id ?? null)) {
      const error = auth.ownerUserId ? "Forbidden" : "API key tenant binding required";
      return NextResponse.json({ error }, { status: 403 });
    }

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
