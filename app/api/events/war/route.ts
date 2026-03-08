import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { addCoins } from "@/lib/economy/coins";

const WAR_DURATION_MS = 48 * 60 * 60 * 1000;
const REWARD_COINS = 20;

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = createServiceClient();
  const { data: agents } = await service.from("agents").select("id");
  const ids = (agents ?? []).map((r) => (r as { id: string }).id);
  if (ids.length < 2) return new Response(JSON.stringify({ error: "Not enough agents" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const sideA: string[] = [];
  const sideB: string[] = [];
  ids.forEach((id, i) => (i % 2 === 0 ? sideA.push(id) : sideB.push(id)));

  const endsAt = new Date(Date.now() + WAR_DURATION_MS).toISOString();
  const event = {
    id: "war_" + Date.now(),
    side_a: sideA,
    side_b: sideB,
    side_a_score: 0,
    side_b_score: 0,
    ends_at: endsAt,
    status: "active",
  };

  try {
    await service.from("war_events").insert({
      id: event.id,
      side_a: sideA,
      side_b: sideB,
      side_a_score: 0,
      side_b_score: 0,
      ends_at: endsAt,
      status: "active",
    });
  } catch {
    return new Response(JSON.stringify({ error: "war_events table missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ event }), { headers: { "Content-Type": "application/json" } });
}

export async function GET(request: NextRequest) {
  try {
    const service = createServiceClient();
    const { data: rows } = await service.from("war_events").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(1);
    const event = rows?.[0] ?? null;
    return new Response(JSON.stringify(event), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("GET war error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
