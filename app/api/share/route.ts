import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/share" });

function generateSlug(): string {
  return randomBytes(12).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(`share:${user.id}`);
    if (!rl) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const slug = generateSlug();
    await service.from("share_cards").insert({ slug, agent_id: agentId });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = baseUrl ? `${baseUrl}/share/${slug}` : `/share/${slug}`;

    return NextResponse.json({ url, slug });
  } catch (e) {
    log.error("POST /api/share error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
