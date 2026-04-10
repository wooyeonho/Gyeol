import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { decodeStoredSecret, encryptSecret } from "@/lib/security/secret-crypto";
import { getResolvedBillingState } from "@/lib/billing/service";
import { parseBody, integrationTokenBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const log = logger.child({ route: "api/integrations/github" });

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
    const allowed = await checkRateLimit(`integration-github-post:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(request, integrationTokenBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const encrypted = encryptSecret(parsed.data.access_token);
    if (!encrypted) {
      return NextResponse.json({ error: "Service not configured: CONNECTION_TOKEN_KEY" }, { status: 503 });
    }

    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "github",
        token_encrypted: encrypted,
        metadata: {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET: Fetch recent GitHub activity and inject into agent memory
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const billing = await getResolvedBillingState(service, user.id);
    if (!billing.entitlements.multichannel) {
      return NextResponse.json({ error: "Multichannel integrations require Premium plan", code: "ENTITLEMENT_REQUIRED" }, { status: 403 });
    }
    const allowed = await checkRateLimit(`integration-github-get:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const { data: conn } = await service
      .from("user_connections")
      .select("id, token_encrypted")
      .eq("user_id", user.id)
      .eq("service", "github")
      .single();
    if (!conn) return NextResponse.json({ error: "GitHub not connected" }, { status: 404 });

    const row = conn as { id?: string; token_encrypted: string };
    const decoded = decodeStoredSecret(row.token_encrypted);
    const token = decoded.secret;
    if (!token) {
      return NextResponse.json({ error: "Failed to decrypt GitHub token" }, { status: 503 });
    }
    if (decoded.legacyPlaintext && row.id) {
      const rotated = encryptSecret(token);
      if (rotated) {
        service.from("user_connections").update({ token_encrypted: rotated }).eq("id", row.id).then(() => {});
      }
    }

    // Fetch authenticated user's recent events
    const eventsRes = await fetch("https://api.github.com/user/events?per_page=10", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!eventsRes.ok) return NextResponse.json({ error: "GitHub API error", status: eventsRes.status }, { status: 502 });

    type GHEvent = { type: string; repo?: { name?: string }; payload?: { commits?: { message?: string }[]; pull_request?: { title?: string }; issue?: { title?: string } } };
    const events = (await eventsRes.json()) as GHEvent[];

    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ synced: 0 });

    const memories: string[] = [];
    for (const ev of events.slice(0, 5)) {
      const repo = ev.repo?.name ?? "unknown";
      if (ev.type === "PushEvent") {
        const msgs = ev.payload?.commits?.map((c) => c.message).filter(Boolean).slice(0, 2).join(", ");
        if (msgs) memories.push(`GitHub push to ${repo}: ${msgs}`);
      } else if (ev.type === "PullRequestEvent") {
        const title = ev.payload?.pull_request?.title;
        if (title) memories.push(`GitHub PR in ${repo}: ${title}`);
      } else if (ev.type === "IssuesEvent") {
        const title = ev.payload?.issue?.title;
        if (title) memories.push(`GitHub issue in ${repo}: ${title}`);
      }
    }

    let synced = 0;
    for (const content of memories) {
      const embedding = await generateEmbedding(content).catch(() => [] as number[]);
      await service.from("memories").insert({
        agent_id: agentId,
        type: "github_activity",
        content,
        embedding: embedding.length > 0 ? embedding : null,
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (e) {
    log.error("GET failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
