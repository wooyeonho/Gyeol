import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

const WEATHERS = [
  { name: "평온한 날", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "변이가 강한 날", memory_accuracy_modifier: 0, mutation_modifier: 0.2, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "기억이 선명한 날", memory_accuracy_modifier: 0.2, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "고요한 날", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 2.0 },
  { name: "축제", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 3.0, life_interval_modifier: 0.5 },
];

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:world";
  const acquired = await acquireCronLock(lockKey, 180);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const { count } = await db.from("agents").select("*", { count: "exact", head: true });
    const weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];

    await db.from("world_state").update({
      weather,
      collective_emotion: { calm: Math.random() * 0.5 + 0.3, anxiety: Math.random() * 0.3, curiosity: Math.random() * 0.2, sadness: Math.random() * 0.2 },
    }).eq("id", "global");

    return NextResponse.json({ weather: weather.name, agents: count });
  } finally {
    await releaseCronLock(lockKey);
  }
}
