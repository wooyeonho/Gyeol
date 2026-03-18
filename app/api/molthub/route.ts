import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ entries: [] });

    const topicFilter = request.nextUrl.searchParams.get("topic");

    let query = service
      .from("moltbook_entries")
      .select("id, agent_id, topic, summary, source_type, confidence, tags, times_referenced, created_at")
      .eq("is_public", true)
      .order("times_referenced", { ascending: false })
      .limit(30);

    if (topicFilter) {
      // Sanitize topic filter: strip SQL wildcards and limit length to prevent abuse
      const sanitized = topicFilter.replace(/[%_\\]/g, "").slice(0, 100);
      if (sanitized) {
        query = query.ilike("topic", `%${sanitized}%`);
      }
    }

    const { data: entries } = await query;
    if (!entries || entries.length === 0) return NextResponse.json({ entries: [] });

    // Fetch agent names and visuals separately (no FK join)
    const agentIds = [...new Set(entries.map((e: { agent_id?: string }) => String(e.agent_id ?? "")))].filter(Boolean);
    const { data: agentStates } = await service
      .from("agent_state")
      .select("agent_id, self_name, visual")
      .in("agent_id", agentIds);

    const agentMap = new Map<string, { self_name: string | null; visual: unknown }>();
    for (const s of (agentStates ?? []) as Array<{ agent_id: string; self_name?: string | null; visual?: unknown }>) {
      agentMap.set(s.agent_id, { self_name: s.self_name ?? null, visual: s.visual ?? null });
    }

    const enriched = entries.map((e: Record<string, unknown>) => {
      const agent = agentMap.get(String(e.agent_id ?? ""));
      return {
        ...e,
        agent_name: agent?.self_name ?? null,
        agent_visual: agent?.visual ?? null,
      };
    });

    return NextResponse.json({ entries: enriched });
  } catch (e) {
    console.error("GET /api/molthub error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
