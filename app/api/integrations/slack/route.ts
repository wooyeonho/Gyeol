import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { decodeStoredSecret, encryptSecret } from "@/lib/security/secret-crypto";
import { getResolvedBillingState } from "@/lib/billing/service";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const log = logger.child({ route: "api/integrations/slack" });

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const billing = await getResolvedBillingState(service, user.id);
    if (!billing.entitlements.multichannel) {
      return NextResponse.json({ error: "Multichannel integrations require Premium plan", code: "ENTITLEMENT_REQUIRED" }, { status: 403 });
    }
    const allowed = await checkRateLimit(`integration-slack-post:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));

    // If message is provided, send to Slack channel
    if (typeof body?.message === "string" && body.message.trim()) {
      const fence = checkElectricFence(body.message);
      if (fence.blocked) {
        return NextResponse.json({ error: fence.reason || "Blocked content" }, { status: 400 });
      }
      const { data: conn } = await service
        .from("user_connections")
        .select("id, token_encrypted, metadata")
        .eq("user_id", user.id)
        .eq("service", "slack")
        .single();
      if (!conn) return NextResponse.json({ error: "Slack not connected" }, { status: 404 });

      const row = conn as { id?: string; token_encrypted: string; metadata?: { channel_id?: string } };
      const decoded = decodeStoredSecret(row.token_encrypted);
      const token = decoded.secret;
      if (!token) return NextResponse.json({ error: "Failed to decrypt Slack token" }, { status: 503 });
      if (decoded.legacyPlaintext && row.id) {
        const rotated = encryptSecret(token);
        if (rotated) {
          service.from("user_connections").update({ token_encrypted: rotated }).eq("id", row.id).then(() => {});
        }
      }
      const channelId = row.metadata?.channel_id;
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
    const encrypted = encryptSecret(accessToken);
    if (!encrypted) {
      return NextResponse.json({ error: "Service not configured: CONNECTION_TOKEN_KEY" }, { status: 503 });
    }
    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "slack",
        token_encrypted: encrypted,
        metadata: body?.channel_id ? { channel_id: body.channel_id } : {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
