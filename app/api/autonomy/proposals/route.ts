import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeSafePlan } from "@/lib/autonomy/safe-evolution";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ proposals: [] });

    const { data: rows } = await service
      .from("autonomy_proposals")
      .select("id, title, proposal_type, risk_level, status, created_by, plan, review_note, created_at, reviewed_at, executed_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ proposals: rows ?? [] });
  } catch (e) {
    console.error("autonomy/proposals GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = await checkRateLimit(`autonomy-proposals-post:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
    const proposalType = typeof body?.proposal_type === "string" ? body.proposal_type.trim().slice(0, 60) : "";
    const riskLevel = body?.risk_level === "high" || body?.risk_level === "low" ? body.risk_level : "medium";
    const createdBy = body?.created_by === "ai" ? "ai" : "user";
    if (!title || !proposalType) {
      return NextResponse.json({ error: "title and proposal_type required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const plan = sanitizeSafePlan(body?.plan);
    const { data: inserted, error } = await service
      .from("autonomy_proposals")
      .insert({
        user_id: user.id,
        agent_id: agentId,
        title,
        proposal_type: proposalType,
        risk_level: riskLevel,
        created_by: createdBy,
        plan,
        status: "pending",
      })
      .select("id, title, proposal_type, risk_level, status, created_by, plan, created_at")
      .single();
    if (error) {
      console.error("autonomy/proposals insert", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    await service.from("autonomy_action_logs").insert({
      proposal_id: inserted?.id,
      user_id: user.id,
      agent_id: agentId,
      action: "proposed",
      detail: title,
      payload: { proposal_type: proposalType, risk_level: riskLevel, created_by: createdBy },
    });

    return NextResponse.json({ ok: true, proposal: inserted });
  } catch (e) {
    console.error("autonomy/proposals POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
