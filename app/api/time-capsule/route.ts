import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { sanitizeUserInput } from "@/lib/sanitize";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { parseBody, timeCapsuleBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`time-capsule:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const parsed = await parseBody(req, timeCapsuleBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const fence = checkElectricFence(parsed.data.message);
    if (fence.blocked) {
      return NextResponse.json({ error: fence.reason || "Blocked content" }, { status: 400 });
    }
    const message = sanitizeUserInput(parsed.data.message);
    const deliverAt = new Date(parsed.data.deliver_at);
    if (deliverAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "deliver_at must be a future date" }, { status: 400 });
    }
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 2);
    if (deliverAt.getTime() > maxFuture.getTime()) {
      return NextResponse.json({ error: "deliver_at too far in the future" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const basePayload = {
      agent_id: agent.id,
      deliver_at: deliverAt.toISOString(),
      delivered: false,
      written_by: "user",
    };
    const insertMessage = await service.from("time_capsules").insert({
      ...basePayload,
      message,
    });
    if (insertMessage.error) {
      const insertContent = await service.from("time_capsules").insert({
        ...basePayload,
        content: message,
      });
      if (insertContent.error) {
        logger.error("time-capsule insert", { error: insertContent.error });
        return NextResponse.json({ error: "Failed to create capsule" }, { status: 500 });
      }
    }

    await service.from("autonomous_logs").insert({
      agent_id: agent.id,
      action_type: "time_capsule",
      summary: `Created time capsule for ${deliverAt.toISOString().slice(0, 10)}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("time-capsule POST", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ capsules: [] });

    const query = await service
      .from("time_capsules")
      .select("*")
      .eq("agent_id", agent.id)
      .order("deliver_at", { ascending: true })
      .limit(50);

    const capsules = (query.data ?? []).map((row) => ({
      id: row.id as string,
      message: (row as { message?: string; content?: string }).message ?? (row as { content?: string }).content ?? "",
      deliver_at: row.deliver_at as string,
      delivered: Boolean(row.delivered),
      created_at: row.created_at as string,
      written_by: (row as { written_by?: string }).written_by ?? "user",
    }));
    return NextResponse.json({ capsules });
  } catch (e) {
    logger.error("time-capsule GET", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
