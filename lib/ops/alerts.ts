import { createServiceClient } from "@/lib/supabase/service";

type AlertLevel = "info" | "warning" | "critical";

export async function writeSystemAlert(args: {
  level: AlertLevel;
  source: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}): Promise<void> {
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
