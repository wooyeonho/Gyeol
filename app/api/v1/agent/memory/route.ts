import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { authorizeV1ApiKey, canAccessAgent, getApiKeyIdentifier } from "@/lib/api/v1-auth";
import { parseBody, v1MemoryBodySchema } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const auth = await authorizeV1ApiKey(request, "v1:agent:memory");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const allowed = await checkRateLimit(`v1-memory:${getApiKeyIdentifier(request)}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(request, v1MemoryBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { agent_id: agentId, type } = parsed.data;
    const fence = checkElectricFence(parsed.data.content);
    if (fence.blocked) {
      return NextResponse.json({ error: fence.reason || "Blocked content" }, { status: 400 });
    }
    const content = sanitizeUserInput(parsed.data.content);

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
    logger.error("v1/agent/memory POST", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
