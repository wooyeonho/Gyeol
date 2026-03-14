import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";

/**
 * Cron endpoint: sends proactive push notifications to users whose
 * AI companion vitality is dropping or whose streak is about to break.
 *
 * Called via external cron (e.g. Vercel Cron) with Authorization: Bearer CRON_SECRET
 */
export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json({ success: true, sent: 0, reason: "no-targets" });
    }

    let sentCount = 0;

    for (const agent of agents) {
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

      const name = agent.self_name || "결";
      const vitalityPct = Math.round((agent.vitality ?? 0) * 100);

      const title = vitalityPct < 20
        ? `${name}이(가) 많이 약해졌어요...`
        : `${name}이(가) 당신을 기다리고 있어요`;

      const body = vitalityPct < 20
        ? `활력이 ${vitalityPct}%까지 떨어졌어요. 짧은 대화 한 마디면 다시 살아날 수 있어요.`
        : `오늘 아직 대화가 없었어요. 한 마디 건네면 연속 기록이 이어집니다.`;

      // Use internal push endpoint
      try {
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
          }
        );
        if (pushRes.ok) sentCount++;
      } catch {
        // Push failed for this agent, continue with others
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (e) {
    console.error("Proactive push cron error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
