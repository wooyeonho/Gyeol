import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { absorbSharedKnowledge } from "@/lib/moltbook";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ absorbed: false });

    const body = await request.json() as { entryId?: string };
    if (!body.entryId) {
      return NextResponse.json({ error: "entryId required" }, { status: 400 });
    }

    const absorbed = await absorbSharedKnowledge(agentId, body.entryId);
    return NextResponse.json({ absorbed });
  } catch (e) {
    console.error("POST /api/molthub/star error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
