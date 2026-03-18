import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { absorbSharedKnowledge } from "@/lib/moltbook";
import { checkRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: prevent abuse on star endpoint
    const allowed = await checkRateLimit(`molthub_star:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ absorbed: false });

    const body = await request.json() as { entryId?: string };
    if (!body.entryId) {
      return NextResponse.json({ error: "entryId required" }, { status: 400 });
    }

    // Validate entryId is a proper UUID to prevent injection
    if (!UUID_RE.test(body.entryId)) {
      return NextResponse.json({ error: "Invalid entryId format" }, { status: 400 });
    }

    const absorbed = await absorbSharedKnowledge(agentId, body.entryId);
    return NextResponse.json({ absorbed });
  } catch (e) {
    console.error("POST /api/molthub/star error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
