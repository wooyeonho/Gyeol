import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const service = createServiceClient();
    const { agentId, hasMultiple } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ agentId: null, agentState: null });
    }
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    return NextResponse.json({ agentId, agentState: state ?? null, hasMultipleAgents: hasMultiple });
  } catch (e) {
    console.error("GET /api/agent/state error", e);
    if (isMissingEnvError(e)) {
      return NextResponse.json(
        { error: "Service unavailable: missing server configuration", code: "MISSING_ENV" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
