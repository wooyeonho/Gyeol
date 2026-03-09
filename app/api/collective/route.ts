import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: states } = await service
      .from("agent_state")
      .select("mood, vitality, gen_level")
      .limit(1000);
    const moodDist = (states ?? []).reduce((acc, row) => {
      const mood = (row.mood ?? "unknown") as string;
      acc[mood] = (acc[mood] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const total = states?.length ?? 0;
    const avgVitality = total > 0
      ? (states ?? []).reduce((sum, row) => sum + Number(row.vitality ?? 0), 0) / total
      : 0;
    const avgGenLevel = total > 0
      ? (states ?? []).reduce((sum, row) => sum + Number(row.gen_level ?? 1), 0) / total
      : 1;

    const normalizedMood = Object.entries(moodDist).reduce((acc, [key, count]) => {
      acc[key] = total > 0 ? count / total : 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      collective: {
        total_agents: total,
        mood_distribution: normalizedMood,
        avg_vitality: Number(avgVitality.toFixed(3)),
        avg_gen_level: Number(avgGenLevel.toFixed(2)),
      },
    });
  } catch (e) {
    console.error("collective GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

    const service = createServiceClient();
    const { data: rows } = await service
      .from("agent_state")
      .select("agent_id, self_name, mood, fragments, gen_level")
      .order("gen_level", { ascending: false })
      .limit(30);
    const candidates = (rows ?? []).slice(0, 5) as Array<{
      agent_id: string;
      self_name?: string | null;
      mood?: string | null;
      fragments?: string[] | null;
      gen_level?: number | null;
    }>;
    if (candidates.length === 0) return NextResponse.json({ error: "No agents available" }, { status: 404 });

    const opinions: Array<{ agent_id: string; self_name: string; insight: string }> = [];
    for (const a of candidates) {
      const frag = Array.isArray(a.fragments) ? a.fragments.slice(0, 5).join(" / ") : "";
      const raw = await generateJSON(
        "You are one perspective among collective AI agents. Reply ONLY valid JSON.",
        `Question: ${question}\nName: ${a.self_name ?? "Gyeol"}\nMood: ${a.mood ?? "neutral"}\nFragments: ${frag}\n\nJSON: {"insight":"2-3 sentence answer in Korean"}`,
      ) as { insight?: string } | null;
      const insight = raw?.insight?.trim() ? raw.insight.trim().slice(0, 400) : "관점을 정리하지 못했습니다.";
      opinions.push({
        agent_id: a.agent_id,
        self_name: a.self_name ?? "...",
        insight,
      });
    }

    const synthesisRaw = await generateJSON(
      "You synthesize multiple AI perspectives. Reply ONLY valid JSON.",
      `Question: ${question}\nPerspectives:\n${opinions.map((o) => `- ${o.self_name}: ${o.insight}`).join("\n")}\n\nJSON: {"summary":"final integrated answer in Korean, 3-5 sentences","key_points":["point1","point2","point3"]}`,
    ) as { summary?: string; key_points?: string[] } | null;

    return NextResponse.json({
      question,
      contributors: opinions.length,
      perspectives: opinions,
      synthesis: {
        summary: synthesisRaw?.summary?.slice(0, 1000) ?? "종합 관점을 만들지 못했습니다.",
        key_points: Array.isArray(synthesisRaw?.key_points) ? synthesisRaw!.key_points.slice(0, 5) : [],
      },
    });
  } catch (e) {
    console.error("collective POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
