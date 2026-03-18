// Extracted world logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

const WEATHERS = [
  { name: "peaceful day", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "high mutation day", memory_accuracy_modifier: 0, mutation_modifier: 0.2, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "vivid memory day", memory_accuracy_modifier: 0.2, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 1.0 },
  { name: "quiet day", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 0, life_interval_modifier: 2.0 },
  { name: "festival", memory_accuracy_modifier: 0, mutation_modifier: 0, social_modifier: 3.0, life_interval_modifier: 0.5 },
];

export async function executeWorld(): Promise<CronResult> {
  const lockKey = "cron:world";
  const acquired = await acquireCronLock(lockKey, 180);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  try {
    const db = createServiceClient();
    const { count } = await db.from("agents").select("*", { count: "exact", head: true });
    const weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];

    await db.from("world_state").update({
      weather,
      collective_emotion: { calm: Math.random() * 0.5 + 0.3, anxiety: Math.random() * 0.3, curiosity: Math.random() * 0.2, sadness: Math.random() * 0.2 },
    }).eq("id", "global");

    return { processed: 1, weather: weather.name, agents: count, timestamp: new Date().toISOString() };
  } finally {
    await releaseCronLock(lockKey);
  }
}
