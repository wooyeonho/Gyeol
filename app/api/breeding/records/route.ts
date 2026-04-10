import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPrimaryAgent } from "@/lib/agents/primary";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await getPrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ records: [] });

    const { data: rows } = await service
      .from("breeding_records")
      .select("id, parent_a, parent_b, status, child_id, created_at")
      .or(`parent_a.eq.${agentId},parent_b.eq.${agentId}`)
      .order("created_at", { ascending: false })
      .limit(20);

    // Resolve partner names
    const records = rows ?? [];
    const partnerIds = records.map((r) =>
      (r as { parent_a: string; parent_b: string }).parent_a === agentId
        ? (r as { parent_b: string }).parent_b
        : (r as { parent_a: string }).parent_a
    );
    const uniqueIds = [...new Set(partnerIds)];

    const nameMap: Record<string, string | null> = {};
    if (uniqueIds.length > 0) {
      const { data: states } = await service
        .from("agent_state")
        .select("agent_id, self_name")
        .in("agent_id", uniqueIds);
      for (const s of states ?? []) {
        nameMap[(s as { agent_id: string }).agent_id] =
          (s as { self_name?: string | null }).self_name ?? null;
      }
    }

    const enriched = records.map((r, i) => ({
      ...(r as Record<string, unknown>),
      partner_name: nameMap[partnerIds[i]] ?? null,
    }));

    return NextResponse.json({ records: enriched });
  } catch (e) {
    logger.error("GET /api/breeding/records error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
