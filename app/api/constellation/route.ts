import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ stars: [], constellations: [] });

    const [{ data: mems }, { data: state }] = await Promise.all([
      service
        .from("memories")
        .select("id, content, type, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true })
        .limit(100),
      service
        .from("agent_state")
        .select("self_name, visual, genome, config, self_model, gen_level, vitality, mood")
        .eq("agent_id", agentId)
        .single(),
    ]);
    const stars = (mems ?? []).map((m, i) => ({
      id: (m as { id: string }).id,
      content: ((m as { content?: string }).content ?? "").slice(0, 60),
      type: (m as { type?: string }).type ?? "memory",
      created_at: (m as { created_at?: string }).created_at,
      x: (i % 10) / 5 - 1,
      y: Math.floor(i / 10) / 5 - 0.5,
      z: (Math.random() - 0.5) * 0.5,
    }));

    const constellations = [
      { name: "First talk", starIds: stars.slice(0, 3).map((s) => s.id) },
      { name: "Sad night", starIds: stars.filter((s) => /sad|miss|lonely/i.test(s.content)).slice(0, 3).map((s) => s.id) },
      { name: "Bright day", starIds: stars.filter((s) => /happy|good|joy/i.test(s.content)).slice(0, 3).map((s) => s.id) },
    ].filter((c) => c.starIds.length > 0);

    const stateData = state as {
      self_name?: string | null;
      visual?: unknown;
      genome?: unknown;
      config?: { usage_profile?: unknown } | null;
      self_model?: unknown;
      gen_level?: number | null;
      vitality?: number | null;
      mood?: string | null;
    } | null;

    return NextResponse.json({
      stars,
      constellations,
      selfAgent: stateData
        ? {
            self_name: stateData.self_name ?? null,
            visual: stateData.visual ?? null,
            genome: stateData.genome ?? null,
            config: { usage_profile: stateData.config?.usage_profile ?? null },
            self_model: stateData.self_model ?? null,
            gen_level: stateData.gen_level ?? 1,
            vitality: stateData.vitality ?? 1,
            mood: stateData.mood ?? null,
          }
        : null,
    });
  } catch (e) {
    console.error("constellation GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
