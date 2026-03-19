import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import webpush from "web-push";

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:ops@gyeol.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { agentId, title, body, url } = await req.json();
    const service = createServiceClient();

    let query = service.from("push_subscriptions").select("*");
    if (agentId) {
      query = query.eq("agent_id", agentId);
    }
    
    const { data: subs } = await query;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const payload = JSON.stringify({ title, body, data: { url: url || "/" } });
    let sentCount = 0;

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sentCount++;
      } catch (e: unknown) {
        const statusCode = e instanceof Error && "statusCode" in e ? (e as { statusCode: number }).statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
           await service.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
           console.error("Failed to send push", e);
        }
      }
    }));

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (e) {
    console.error("Push send error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
