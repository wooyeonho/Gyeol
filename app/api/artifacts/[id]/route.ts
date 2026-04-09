import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`artifacts:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: artifact } = await service
      .from("artifacts")
      .select("id, agent_id")
      .eq("id", id)
      .eq("agent_id", agentId)
      .single();
    if (!artifact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const updates: { is_preserved?: boolean; is_public?: boolean } = {};
    if (typeof body.is_preserved === "boolean") updates.is_preserved = body.is_preserved;
    if (typeof body.is_public === "boolean") updates.is_public = body.is_public;
    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

    await service.from("artifacts").update(updates).eq("id", id).eq("agent_id", agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("PATCH /api/artifacts/[id] error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
