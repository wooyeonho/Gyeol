import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function checkResearchAuth(req: NextRequest): boolean {
  const expected = process.env.RESEARCH_API_KEY;
  if (!expected) return false;
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!key || key.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!process.env.RESEARCH_API_KEY) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }
  if (!checkResearchAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const { count: agentCount } = await db.from("agents").select("*", { count: "exact", head: true });
  const { count: memoryCount } = await db.from("memories").select("*", { count: "exact", head: true });
  const { count: chatCount } = await db.from("chats").select("*", { count: "exact", head: true });

  const { data: stateRows } = await db.from("agent_state").select("gen_level, vitality, mood");
  const genLevels = (stateRows || []).reduce((acc: Record<number, number>, r) => {
    const l = r.gen_level ?? 1;
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});
  const moods = (stateRows || []).reduce((acc: Record<string, number>, r) => {
    const m = r.mood || "unknown";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const avgVitality = stateRows?.length
    ? (stateRows as { vitality?: number }[]).reduce((s, r) => s + (r.vitality ?? 1), 0) / stateRows.length
    : 0;

  const { data: memoryTypes } = await db.from("memories").select("type");
  const typeCounts = (memoryTypes || []).reduce((acc: Record<string, number>, r) => {
    const t = r.type || "unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    data: {
      agents_total: agentCount ?? 0,
      memories_total: memoryCount ?? 0,
      chats_total: chatCount ?? 0,
      gen_level_distribution: genLevels,
      mood_distribution: moods,
      memory_type_distribution: typeCounts,
      avg_vitality: Math.round(avgVitality * 100) / 100,
    },
  });
}
