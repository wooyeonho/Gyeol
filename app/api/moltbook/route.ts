import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ entries: [] });

    const { data: entries } = await service
      .from("moltbook_entries")
      .select("id, topic, summary, source_type, confidence, tags, times_referenced, is_public, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ entries: entries ?? [] });
  } catch (e) {
    console.error("GET /api/moltbook error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
