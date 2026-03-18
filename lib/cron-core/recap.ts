// Extracted recap logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { getResolvedBillingState } from "@/lib/billing/service";
import { buildWeeklyRecapText } from "@/lib/recap/build-weekly";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

const MILESTONE_TYPES = [
  "evolution",
  "dream",
  "artifact_creation",
  "social_encounter",
  "self_naming",
  "personality_evolution",
  "perspective_journal",
] as const;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const EMAIL_API_URL = process.env.EMAIL_API_URL;

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096) }),
  });
  return res.ok;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!EMAIL_API_URL) return false;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.CRON_SECRET) headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  else if (process.env.EMAIL_SEND_SECRET) headers["X-Email-Send-Secret"] = process.env.EMAIL_SEND_SECRET;
  const res = await fetch(EMAIL_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, subject, body, deliveries: [{ to, subject, body }] }),
  });
  return res.ok;
}

export async function executeRecap(): Promise<CronResult> {
  const lockKey = "cron:recap";
  const acquired = await acquireCronLock(lockKey, 3600);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };

  try {
    const db = createServiceClient();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStartIso = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const monthStartIso = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
    const todayStartIso = todayStart.toISOString();

    const { data: agents } = await db.from("agents").select("id, user_id").limit(500);
    const results: { agent_id: string; telegram?: boolean; email?: boolean }[] = [];

    for (const agent of agents ?? []) {
      const { data: stateData } = await db
        .from("agent_state")
        .select("channels, self_name, total_messages")
        .eq("agent_id", agent.id)
        .single();
      const channels = stateData as { channels?: { telegram?: string; email?: string }; self_name?: string; total_messages?: number } | null;

      const ch = channels?.channels ?? {};
      const telegramChatId = typeof ch?.telegram === "string" && ch.telegram.trim() ? ch.telegram.trim() : null;
      const wantsEmail = Boolean(ch?.email);
      if (!telegramChatId && !wantsEmail) continue;

      const [
        { data: stateRow },
        { data: recentChats },
        { data: recentLogs },
        { data: recentArtifacts },
      ] = await Promise.all([
        db.from("agent_state").select("total_messages, self_name").eq("agent_id", agent.id).single(),
        db.from("chats").select("created_at, role").eq("agent_id", agent.id).gte("created_at", monthStartIso).order("created_at", { ascending: false }).limit(200),
        db.from("autonomous_logs").select("created_at, action_type").eq("agent_id", agent.id).gte("created_at", monthStartIso).order("created_at", { ascending: false }).limit(200),
        db.from("artifacts").select("created_at, type").eq("agent_id", agent.id).gte("created_at", monthStartIso).order("created_at", { ascending: false }).limit(100),
      ]);

      const state = stateRow as { total_messages?: number; self_name?: string } | null;
      const chatRows = (recentChats ?? []) as Array<{ created_at?: string; role?: string }>;
      const logRows = (recentLogs ?? []) as Array<{ created_at?: string; action_type?: string }>;
      const artifactRows = (recentArtifacts ?? []) as Array<{ created_at?: string }>;

      const allActivityDates = [
        ...chatRows.map((c) => c.created_at).filter(Boolean),
        ...logRows.map((l) => l.created_at).filter(Boolean),
        ...artifactRows.map((a) => a.created_at).filter(Boolean),
      ] as string[];

      const weekUserMessages = chatRows.filter((c) => c.role === "user" && c.created_at && c.created_at >= weekStartIso).length;
      const weekArtifacts = artifactRows.filter((a) => a.created_at && a.created_at >= weekStartIso).length;
      const weekMilestones = logRows.filter(
        (l) => l.created_at && l.created_at >= weekStartIso && l.action_type && MILESTONE_TYPES.includes(l.action_type as (typeof MILESTONE_TYPES)[number])
      ).length;
      const todayUserMessages = chatRows.filter((c) => c.role === "user" && c.created_at && c.created_at >= todayStartIso).length;
      const todayActivities = logRows.filter((l) => l.created_at && l.created_at >= todayStartIso).length;

      const billing = await getResolvedBillingState(db, agent.user_id);
      const selfName = state?.self_name ?? (channels?.self_name as string | undefined) ?? "결의";

      const weeklyText = buildWeeklyRecapText({
        agentId: agent.id,
        selfName,
        totalMessages: state?.total_messages ?? 0,
        weekUserMessages,
        weekArtifacts,
        weekMilestones,
        todayUserMessages,
        todayActivities,
        activityDates: allActivityDates,
        hasAdvancedRecaps: billing.entitlements.advanced_recaps,
      });

      const result: { agent_id: string; telegram?: boolean; email?: boolean } = { agent_id: agent.id };
      if (telegramChatId) {
        result.telegram = await sendTelegram(telegramChatId, weeklyText);
      }
      if (wantsEmail) {
        let userEmail: string | null = null;
        try {
          const { data } = await db.auth.admin.getUserById(agent.user_id);
          userEmail = (data?.user as { email?: string } | undefined)?.email ?? null;
        } catch {
          // ignore
        }
        if (userEmail) {
          result.email = await sendEmail(
            userEmail,
            `[결의] ${selfName} 주간 리캡`,
            weeklyText
          );
        }
      }
      results.push(result);
    }

    return {
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await releaseCronLock(lockKey);
  }
}
