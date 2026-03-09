import { createServiceClient } from "@/lib/supabase/service";

type AlertLevel = "info" | "warning" | "critical";

type WriteAlertArgs = {
  level: AlertLevel;
  source: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

async function sendSlackAlert(args: WriteAlertArgs): Promise<void> {
  const webhook = process.env.OPS_ALERT_SLACK_WEBHOOK_URL;
  if (!webhook) return;
  try {
    const text = [
      `*[GYEOL ALERT]* ${args.level.toUpperCase()}`,
      `source: ${args.source}`,
      `code: ${args.code}`,
      args.message,
    ].join("\n");
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("[SystemAlert] slack notify failed", e);
  }
}

export async function writeSystemAlert(args: WriteAlertArgs): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from("system_alerts").insert({
      level: args.level,
      source: args.source,
      code: args.code,
      message: args.message,
      details: args.details ?? {},
    });
  } catch (e) {
    console.error("[SystemAlert] failed", e);
  }
}

export async function emitSystemAlert(
  args: WriteAlertArgs,
  options?: { cooldownMinutes?: number; notifySlack?: boolean },
): Promise<boolean> {
  const cooldownMinutes = options?.cooldownMinutes ?? 60;
  try {
    const db = createServiceClient();
    const { data: recentRows } = await db
      .from("system_alerts")
      .select("created_at")
      .eq("source", args.source)
      .eq("code", args.code)
      .order("created_at", { ascending: false })
      .limit(1);
    const recent = Array.isArray(recentRows) && recentRows.length > 0
      ? String(recentRows[0]?.created_at ?? "")
      : null;
    if (recent) {
      const ts = new Date(recent).getTime();
      if (!Number.isNaN(ts) && Date.now() - ts < cooldownMinutes * 60_000) {
        return false;
      }
    }
  } catch {
    // If lookup fails, continue to best-effort write.
  }

  await writeSystemAlert(args);
  if (options?.notifySlack) {
    await sendSlackAlert(args);
  }
  return true;
}
