import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptSecret, encryptSecret } from "@/lib/security/token-crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));

    // If message is provided, send to Slack channel
    if (typeof body?.message === "string" && body.message.trim()) {
      const service = createServiceClient();
      const { data: conn } = await service
        .from("user_connections")
        .select("token_encrypted, metadata")
        .eq("user_id", user.id)
        .eq("service", "slack")
        .single();
      if (!conn) return NextResponse.json({ error: "Slack not connected" }, { status: 404 });

      const token = decryptSecret((conn as { token_encrypted: string; metadata?: { channel_id?: string } }).token_encrypted);
      const channelId = (conn as { metadata?: { channel_id?: string } }).metadata?.channel_id;
      if (!token) return NextResponse.json({ error: "Invalid Slack token configuration" }, { status: 500 });
      if (!channelId) return NextResponse.json({ error: "No channel configured" }, { status: 400 });

      const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: channelId, text: body.message.trim().slice(0, 3000) }),
      });
      const slackData = (await slackRes.json()) as { ok: boolean; error?: string };
      if (!slackData.ok) return NextResponse.json({ error: slackData.error ?? "Slack error" }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    // Otherwise, save token
    const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
    if (!accessToken) return NextResponse.json({ error: "access_token required" }, { status: 400 });

    const service = createServiceClient();
    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "slack",
        token_encrypted: encryptSecret(accessToken),
        metadata: body?.channel_id ? { channel_id: body.channel_id } : {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("integrations/slack POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
