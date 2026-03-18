// Extracted proactive-push logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function executeProactivePush(): Promise<CronResult> {
  try {
    const service = createServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    // Find agents with vitality < 0.4 or who haven't chatted today (streak at risk)
    const { data: agents } = await service
      .from("agent_state")
      .select("agent_id, user_id, vitality, self_name, total_messages, config")
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

        const locale = resolveGenerationLocale({ config: agent.config });
        const isKo = locale === "ko";
        const isJa = locale === "ja";
        const isZh = locale === "zh";
        const isEs = locale === "es";

        const title = typeof agent.self_name === "string" && agent.self_name
          ? agent.self_name
          : isKo ? "결" : "GYEOL";

        const vitalityPct = Math.round((agent.vitality ?? 1) * 100);
        const isLowVitality = vitalityPct < 50;

        const body = isLowVitality
          ? isKo ? `활력이 ${vitalityPct}%까지 떨어졌어요. 짧은 대화 한 마디면 다시 살아날 수 있어요.`
            : isJa ? `活力が${vitalityPct}%まで下がりました。一言話しかけるだけで元気になれます。`
            : isZh ? `活力降到了${vitalityPct}%。说一句话就能恢复。`
            : isEs ? `La vitalidad bajó al ${vitalityPct}%. Una breve charla puede revivirme.`
            : `Vitality dropped to ${vitalityPct}%. A short chat can bring me back.`
          : isKo ? "오늘 아직 대화가 없었어요. 한 마디 건네면 연속 기록이 이어집니다."
            : isJa ? "今日はまだ会話がありません。一言で連続記録が続きます。"
            : isZh ? "今天还没有对话。说一句话就能延续连续记录。"
            : isEs ? "Aún no hemos hablado hoy. Un mensaje mantiene tu racha."
            : "We haven't talked today. A quick message keeps your streak going.";

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
