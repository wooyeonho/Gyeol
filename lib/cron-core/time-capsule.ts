// Extracted time-capsule logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

export async function executeTimeCapsule(): Promise<CronResult> {
  const lockKey = "cron:time-capsule";
  const acquired = await acquireCronLock(lockKey, 180);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  try {
    const db = createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: dueCapsules } = await db
      .from("time_capsules")
      .select("*")
      .eq("delivered", false)
      .lte("deliver_at", nowIso)
      .order("deliver_at", { ascending: true })
      .limit(100);

    if (!dueCapsules?.length) {
      return { processed: 0, timestamp: nowIso };
    }

    let processed = 0;
    for (const capsule of dueCapsules) {
      try {
        const message =
          (capsule as { message?: string; content?: string }).message ??
          (capsule as { content?: string }).content ??
          "";
        if (!message) continue;

        const agentId = (capsule as { agent_id: string }).agent_id;
        const deliverDate = (capsule as { deliver_at?: string }).deliver_at?.slice(0, 10) ?? "unknown date";
        const deliveredText = `시간 캡슐이 도착했어요 (${deliverDate}): ${message}`;

        await db.from("memories").insert({
          agent_id: agentId,
          type: "time_capsule",
          content: deliveredText,
        });

        await db.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "time_capsule_delivered",
          summary: deliveredText.slice(0, 180),
        });

        await db.from("chats").insert({
          agent_id: agentId,
          role: "assistant",
          content: deliveredText,
        });

        await db.from("time_capsules").update({ delivered: true }).eq("id", capsule.id);
        processed++;
      } catch (e) {
        console.error("[TimeCapsuleCron] deliver failed", capsule.id, e);
      }
    }

    return { processed, timestamp: nowIso };
  } finally {
    await releaseCronLock(lockKey);
  }
}
