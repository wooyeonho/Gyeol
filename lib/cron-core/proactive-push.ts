// Extracted proactive-push logic — pure TypeScript, zero Next.js dependencies.
// Enhanced with personalized creature-name push templates (retention feature).

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { buildPersonalizedPush } from "@/lib/retention/personalized-push";
import type { PushContext } from "@/lib/retention/personalized-push";
import { logger } from "@/lib/logger";

export async function executeProactivePush(): Promise<CronResult> {
  try {
    const service = createServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    // Find agents with vitality < 0.4 or who haven't chatted today (streak at risk)
    const { data: agents } = await service
      .from("agent_state")
      .select("agent_id, user_id, vitality, self_name, total_messages, config, streak_days")
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

        // Determine hours since last user message for personalization
        const { data: lastChat } = await service
          .from("chats")
          .select("created_at")
          .eq("agent_id", agent.agent_id)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const hoursAbsent = lastChat
          ? (Date.now() - new Date((lastChat as { created_at: string }).created_at).getTime()) / 3600000
          : 48;

        const locale = resolveGenerationLocale({ config: agent.config });
        const creatureName = typeof agent.self_name === "string" && agent.self_name
          ? agent.self_name
          : locale === "ko" ? "결" : "GYEOL";

        const vitalityPct = Math.round((agent.vitality ?? 1) * 100);
        const streakDays = typeof (agent as Record<string, unknown>).streak_days === "number"
          ? (agent as Record<string, unknown>).streak_days as number
          : 0;

        // Build personalized push using creature name + emotional context
        const pushCtx: PushContext = {
          creatureName,
          vitalityPct,
          streakDays,
          hoursAbsent,
          locale: locale as PushContext["locale"],
        };
        const { title, body } = buildPersonalizedPush(pushCtx, agent.agent_id);

        // Use internal push endpoint
        const pushRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || process.env.GYEOL_APP_URL || "http://localhost:3000"}/api/push/send`,
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
        logger.error(`[ProactivePush] agent ${agent.agent_id} failed`, { error: err instanceof Error ? err.message : err });
        // Continue with remaining agents
      }
    }

    return { processed: sentCount, sent: sentCount, success: true, timestamp: new Date().toISOString() };
  } catch (e) {
    logger.error("Proactive push cron error", e instanceof Error ? e : { error: e });
    return { processed: 0, error: "Internal error", timestamp: new Date().toISOString() };
  }
}
