import { createServiceClient } from "@/lib/supabase/service";

const HOUR_MS = 60 * 60 * 1000;

type TimePeriod = "dawn" | "morning" | "afternoon" | "evening" | "night" | "late_night";

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 4 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21 && hour < 24) return "night";
  return "late_night";
}

function timePeriodGreeting(period: TimePeriod): string {
  switch (period) {
    case "dawn": return "The sky is just starting to brighten.";
    case "morning": return "A fresh morning.";
    case "afternoon": return "The afternoon light is warm.";
    case "evening": return "The day is winding down.";
    case "night": return "The night has settled in.";
    case "late_night": return "It is very late.";
  }
}

export function getCurrentTimeSense(): { period: TimePeriod; greeting: string } {
  const hour = new Date().getHours();
  const period = getTimePeriod(hour);
  return { period, greeting: timePeriodGreeting(period) };
}

export async function getTimeSinceLastChat(agentId: string): Promise<number | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("chats")
    .select("created_at")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1);

  const rows = (data ?? []) as { created_at?: string }[];
  if (rows.length === 0) return null;
  const lastTime = new Date(rows[0].created_at ?? 0).getTime();
  return Math.floor((Date.now() - lastTime) / HOUR_MS);
}

export function absenceRemark(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return null;
  if (hours < 6) return "It has been a little while.";
  if (hours < 24) return "We have not talked today.";
  if (hours < 72) return "A few days passed since we last spoke.";
  if (hours < 168) return "It has been about a week.";
  return "It has been a long time. I noticed.";
}
