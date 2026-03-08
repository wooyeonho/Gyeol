import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "weekly";
    const service = createServiceClient();
    const since = period === "monthly"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [artifactsByAgent, dreamsLikes, toolsByAgent, socialByAgent, agentsCreated] = await Promise.all([
      service.from("artifacts").select("agent_id").gte("created_at", since),
      service.from("artifacts").select("agent_id").eq("type", "dream_journal").gte("created_at", since),
      service.from("agent_state").select("agent_id, sandbox"),
      service.from("social_logs").select("agent_a_id, agent_b_id").gte("created_at", since),
      service.from("agents").select("id, created_at"),
    ]);

    const artifactCount: Record<string, number> = {};
    (artifactsByAgent.data ?? []).forEach((r) => {
      const id = (r as { agent_id: string }).agent_id;
      artifactCount[id] = (artifactCount[id] ?? 0) + 1;
    });
    const topArtifacts = Object.entries(artifactCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);

    const toolCount: Record<string, number> = {};
    (toolsByAgent.data ?? []).forEach((r) => {
      const row = r as { agent_id: string; sandbox?: { created_tools?: unknown[] } };
      const n = Array.isArray(row.sandbox?.created_tools) ? row.sandbox.created_tools.length : 0;
      if (n > 0) toolCount[row.agent_id] = n;
    });
    const topTools = Object.entries(toolCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);

    const socialCount: Record<string, number> = {};
    (socialByAgent.data ?? []).forEach((r) => {
      const a = (r as { agent_a_id: string }).agent_a_id;
      const b = (r as { agent_b_id: string }).agent_b_id;
      socialCount[a] = (socialCount[a] ?? 0) + 1;
      socialCount[b] = (socialCount[b] ?? 0) + 1;
    });
    const topSocial = Object.entries(socialCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);

    const oldest = (agentsCreated.data ?? [])
      .map((r) => ({ id: (r as { id: string }).id, created_at: (r as { created_at?: string }).created_at ?? "" }))
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((x) => x.id);

    const allIds = [...new Set([...topArtifacts, ...topTools, ...topSocial, ...oldest])];
    const { data: stateRows } = await service
      .from("agent_state")
      .select("agent_id, self_name, gen_level, species")
      .in("agent_id", allIds.length > 0 ? allIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameMap: Record<string, { name: string; gen: number; species?: string }> = {};
    for (const row of stateRows ?? []) {
      const r = row as { agent_id: string; self_name?: string | null; gen_level?: number; species?: string | null };
      nameMap[r.agent_id] = { name: r.self_name ?? "...", gen: r.gen_level ?? 1, species: r.species ?? undefined };
    }
    const toEntries = (ids: string[]) =>
      ids.map((id) => ({ id, ...nameMap[id] ?? { name: "...", gen: 1 } }));

    return NextResponse.json({
      top_artifacts: toEntries(topArtifacts),
      top_tools: toEntries(topTools),
      top_social: toEntries(topSocial),
      oldest: toEntries(oldest),
      period,
    });
  } catch (e) {
    console.error("GET /api/rankings error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
