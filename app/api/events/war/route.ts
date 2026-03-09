import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addCoinsAtomic } from "@/lib/economy/coins";

function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === secret;
}

export async function GET() {
  try {
    const db = createServiceClient();
    const { data: event } = await db
      .from("war_events")
      .select("id, side_a, side_b, side_a_score, side_b_score, ends_at, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json(event ?? null);
  } catch (e) {
    console.error("war GET", e);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: active } = await db
      .from("war_events")
      .select("id, side_a, side_b, side_a_score, side_b_score, ends_at, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!active) {
      const { data: agents } = await db.from("agents").select("id").limit(200);
      const ids = (agents ?? []).map((a) => (a as { id: string }).id).sort(() => Math.random() - 0.5);
      if (ids.length < 2) return NextResponse.json({ processed: 0, reason: "not_enough_agents" });
      const mid = Math.floor(ids.length / 2);
      const sideA = ids.slice(0, mid);
      const sideB = ids.slice(mid);
      const endsAt = new Date(Date.now() + 48 * 3600000).toISOString();
      const { data: created, error } = await db
        .from("war_events")
        .insert({
          id: crypto.randomUUID(),
          side_a: sideA,
          side_b: sideB,
          side_a_score: 0,
          side_b_score: 0,
          ends_at: endsAt,
          status: "active",
        })
        .select("id, ends_at")
        .maybeSingle();
      if (error) {
        // Fallback for old schema shape
        await db.from("war_events").insert({
          title: `War #${new Date().toISOString().slice(0, 10)}`,
          description: "Weekly autonomous war event",
          sides: { side_a: sideA, side_b: sideB },
          started_at: nowIso,
          ended_at: endsAt,
        });
      }
      return NextResponse.json({ processed: 1, started: true, event: created ?? null });
    }

    const sideA = Array.isArray((active as { side_a?: string[] }).side_a) ? ((active as { side_a: string[] }).side_a) : [];
    const sideB = Array.isArray((active as { side_b?: string[] }).side_b) ? ((active as { side_b: string[] }).side_b) : [];
    const startedAt = (active as { created_at?: string }).created_at ?? new Date(Date.now() - 24 * 3600000).toISOString();
    const [aLogs, bLogs] = await Promise.all([
      sideA.length > 0
        ? db.from("autonomous_logs").select("id", { count: "exact", head: true }).in("agent_id", sideA).gte("created_at", startedAt)
        : Promise.resolve({ count: 0 }),
      sideB.length > 0
        ? db.from("autonomous_logs").select("id", { count: "exact", head: true }).in("agent_id", sideB).gte("created_at", startedAt)
        : Promise.resolve({ count: 0 }),
    ]);
    const nextAScore = (active as { side_a_score?: number }).side_a_score ?? 0;
    const nextBScore = (active as { side_b_score?: number }).side_b_score ?? 0;
    const updatedAScore = nextAScore + Number((aLogs as { count?: number }).count ?? 0);
    const updatedBScore = nextBScore + Number((bLogs as { count?: number }).count ?? 0);

    const endsAt = new Date((active as { ends_at?: string }).ends_at ?? nowIso).getTime();
    const shouldEnd = !Number.isNaN(endsAt) && endsAt <= Date.now();
    if (shouldEnd) {
      const winner = updatedAScore >= updatedBScore ? "A" : "B";
      const winnerIds = winner === "A" ? sideA : sideB;
      for (const id of winnerIds.slice(0, 300)) {
        await addCoinsAtomic(id, 20, "war_event_win_bonus");
      }
      await db
        .from("war_events")
        .update({
          side_a_score: updatedAScore,
          side_b_score: updatedBScore,
          status: "ended",
        })
        .eq("id", (active as { id: string }).id);
      return NextResponse.json({ processed: 1, ended: true, winner, side_a_score: updatedAScore, side_b_score: updatedBScore });
    }

    await db
      .from("war_events")
      .update({
        side_a_score: updatedAScore,
        side_b_score: updatedBScore,
      })
      .eq("id", (active as { id: string }).id);
    return NextResponse.json({ processed: 1, ended: false, side_a_score: updatedAScore, side_b_score: updatedBScore });
  } catch (e) {
    console.error("war POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
