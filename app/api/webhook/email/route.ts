import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/ops/logger";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (
    auth.length !== CRON_SECRET.length ||
    !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(CRON_SECRET))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id, user_id").limit(1000);
    const summaries: { user_id: string; summary: string }[] = [];
    for (const agent of (agents ?? []).slice(0, 50)) {
      const { data: state } = await service
        .from("agent_state")
        .select("self_name, total_messages, vitality, mood")
        .eq("agent_id", agent.id)
        .single();
      const name = (state as { self_name?: string })?.self_name ?? "Gyeol";
      const msg = (state as { total_messages?: number })?.total_messages ?? 0;
      const vit = (state as { vitality?: number })?.vitality ?? 0;
      summaries.push({
        user_id: agent.user_id,
        summary: `Weekly: ${name}, messages ${msg}, vitality ${Math.round(vit * 100)}%.`,
      });
    }
    if (process.env.EMAIL_API_URL) {
      await fetch(process.env.EMAIL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries }),
      }).catch(() => {});
    }
    return NextResponse.json({ sent: summaries.length, timestamp: new Date().toISOString() });
  } catch (e) {
    logRouteError("Email summary error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
