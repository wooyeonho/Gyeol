import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { getDemoAgentState, getDemoConstellation } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";
import { logRouteError } from "@/lib/ops/logger";
import { buildConstellations } from "@/lib/memory/constellations";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

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
    // Deterministic per-memory depth so stars don't reshuffle on every page
    // load. The previous Math.random() jiggled the constellation each render,
    // breaking the "I remember where that memory was" intuition the metaphor
    // depends on. FNV-1a over the memory id gives stable, well-distributed
    // depth in [-0.25, 0.25].
    function stableDepth(id: string): number {
      let h = 0x811c9dc5;
      for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      // h is a 32-bit signed int; map to [-0.25, 0.25].
      const norm = ((h >>> 0) / 0xffffffff) - 0.5;
      return norm * 0.5;
    }

    const stars = (mems ?? []).map((m, i) => ({
      id: (m as { id: string }).id,
      content: ((m as { content?: string }).content ?? "").slice(0, 60),
      type: (m as { type?: string }).type ?? "memory",
      created_at: (m as { created_at?: string }).created_at,
      x: (i % 10) / 5 - 1,
      y: Math.floor(i / 10) / 5 - 0.5,
      z: stableDepth((m as { id: string }).id),
    }));

    const stateConfig = (state as { config?: Record<string, unknown> } | null)?.config ?? {};
    const locale = resolveGenerationLocale({ config: stateConfig }) === "ko" ? "ko" : "en";

    // Semantic theme matching — replaces the previous English-only regex which
    // never fired on Korean content. match_memories already ranks by cosine
    // similarity weighted by recency + reference count; we keep that ranking
    // and just intersect the top results with the stars on canvas.
    let semanticConstellations: Array<{ name: string; starIds: string[] }> = [];
    try {
      semanticConstellations = await buildConstellations(
        stars,
        async (embedding) => {
          const { data: matches } = await service.rpc("match_memories", {
            p_agent_id: agentId,
            p_embedding: embedding,
            p_match_count: 10,
          });
          return ((matches ?? []) as Array<{ id: string }>).map((m) => m.id);
        },
        locale,
      );
    } catch (err) {
      logRouteError("constellation theme matching", err);
    }

    const firstLightName = locale === "ko" ? "첫 빛" : "First Light";
    const constellations = [
      // Always include a chronological "first memories" anchor so even users
      // with no embeddings yet see at least one constellation.
      { name: firstLightName, starIds: stars.slice(0, 3).map((s) => s.id) },
      ...semanticConstellations.filter((c) => c.name !== firstLightName),
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
    logRouteError("constellation GET", e);
    if (isMissingEnvError(e)) {
      const demoState = getDemoAgentState();
      const demoConstellation = getDemoConstellation();
      return NextResponse.json({
        ...demoConstellation,
        selfAgent: {
          self_name: demoState.self_name,
          visual: demoState.visual,
          genome: demoState.genome,
          config: { usage_profile: (demoState.config as { usage_profile?: unknown })?.usage_profile ?? null },
          self_model: demoState.self_model,
          gen_level: demoState.gen_level,
          vitality: demoState.vitality,
          mood: demoState.mood,
        },
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
