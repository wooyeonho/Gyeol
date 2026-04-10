import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { getDemoWorldState } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/dashboard" });

export async function GET() {
  try {
    const service = createServiceClient();
    const [agentsRes, socialRes, worldRes, artifactsRes] = await Promise.all([
      service.from("agents").select("id", { count: "exact", head: true }),
      service.from("social_logs").select("id", { count: "exact", head: true }),
      service.from("world_state").select("collective_emotion, weather").eq("id", "global").single(),
      service.from("artifacts").select("id", { count: "exact", head: true }),
    ]);

    const agentCount = (agentsRes as { count?: number })?.count ?? 0;
    const socialCount = (socialRes as { count?: number })?.count ?? 0;
    const artifactCount = (artifactsRes as { count?: number })?.count ?? 0;
    const world = worldRes.data as { collective_emotion?: Record<string, number>; weather?: { name?: string } } | null;

    return NextResponse.json({
      agent_count: agentCount,
      social_count: socialCount,
      artifact_count: artifactCount,
      collective_emotion: world?.collective_emotion ?? null,
      weather_name: world?.weather?.name ?? null,
    });
  } catch (e) {
    log.error("dashboard GET", e instanceof Error ? e : { detail: String(e) });
    if (isMissingEnvError(e)) {
      const world = getDemoWorldState();
      return NextResponse.json({
        agent_count: 0,
        social_count: 0,
        artifact_count: 0,
        collective_emotion: world.collective_emotion,
        weather_name: world.weather.name,
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
