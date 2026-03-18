import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPrimaryAgent } from "@/lib/agents/primary";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`breeding:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const service = createServiceClient();
    const { agentId: myAgentId } = await getPrimaryAgent(service, user.id);
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const action = typeof body?.action === "string" ? body.action : "request";
    if (action === "request") {
      const partnerAgentId = typeof body?.partner_agent_id === "string" ? body.partner_agent_id : "";
      if (!partnerAgentId) return NextResponse.json({ error: "partner_agent_id required" }, { status: 400 });
      if (partnerAgentId === myAgentId) return NextResponse.json({ error: "Cannot breed with self" }, { status: 400 });

      const { data: partner } = await service.from("agents").select("id").eq("id", partnerAgentId).single();
      if (!partner?.id) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

      const { data: existing } = await service
        .from("breeding_records")
        .select("id")
        .eq("parent_a", myAgentId)
        .eq("parent_b", partnerAgentId)
        .eq("status", "pending")
        .maybeSingle();
      if (existing?.id) return NextResponse.json({ error: "Pending request already exists" }, { status: 409 });

      const { data: record } = await service
        .from("breeding_records")
        .insert({ parent_a: myAgentId, parent_b: partnerAgentId, status: "pending" })
        .select("id, parent_a, parent_b, status, created_at")
        .single();

      return NextResponse.json({ ok: true, record });
    }

    const recordId = typeof body?.record_id === "string" ? body.record_id : "";
    if (!recordId) return NextResponse.json({ error: "record_id required" }, { status: 400 });

    const { data: record } = await service
      .from("breeding_records")
      .select("*")
      .eq("id", recordId)
      .single();
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
    if (record.status !== "pending") return NextResponse.json({ error: "Record already processed" }, { status: 409 });
    if (record.parent_b !== myAgentId && record.parent_a !== myAgentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "reject") {
      await service.from("breeding_records").update({ status: "rejected" }).eq("id", recordId);
      return NextResponse.json({ ok: true, status: "rejected" });
    }
    if (action !== "accept") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    return NextResponse.json(
      { error: "Breeding accept is not yet available. It will be enabled after multi-agent support." },
      { status: 409 }
    );
  } catch (e) {
    console.error("breeding POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
