// Extracted proactive-push logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";

export async function executeProactivePush(): Promise<CronResult> {
  try {
    const service = createServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    // Find agents with vitality < 0.4 or who haven't chatted today (streak at risk)
    const { data: agents } = await service
      .from("agent_state")
      .select("agent_id, user_id, vitality, self_name, total_messages")
      .lt("vitality", 0.4)
      .limit(100);

    if (!agents || agents.length === 0) {
      return { processed: 0, sent: 0, reason: "no-targets", timestamp: new Date().toISOString() };
    }

    let sentCount = 0;

    for (const agent of agents) {
      try {
        // Check if user chatted today
        const { count } = await service
          .from("chats")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", agent.agent_id)
          .eq("role", "user")
          .gte("created_at", todayStartIso);

        const chattedToday = (count ?? 0) > 0;
        if (chattedToday) continue; // Already active today, skip

        // Get push subscriptions for this user
        const { data: subs } = await service
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", agent.user_id);

        if (!subs || subs.length === 0) continue;

        const name = agent.self_name || "Gyeol";
        const vitalityPct = Math.round((agent.vitality ?? 0) * 100);

        const title = vitalityPct < 20
          ? `${name} is getting very weak...`
          : `${name} is waiting for you`;

        const body = vitalityPct < 20
          ? `Vitality dropped to ${vitalityPct}%. A short chat could bring them back.`
          : `No conversation today yet. Say hi to keep the streak going.`;

        // Use internal push endpoint
        const pushRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/push/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({
              agentId: agent.agent_id,
              title,
              body,
              url: "/",
            }),
            signal: AbortSignal.timeout(15_000),
          }
        );
        if (pushRes.ok) sentCount++;
      } catch (err) {
        console.error(`[ProactivePush] agent ${agent.agent_id} failed:`, err instanceof Error ? err.message : err);
        // Continue with remaining agents
      }
    }

    return { processed: sentCount, sent: sentCount, success: true, timestamp: new Date().toISOString() };
  } catch (e) {
    console.error("Proactive push cron error", e);
    return { processed: 0, error: "Internal error", timestamp: new Date().toISOString() };
  }
}
