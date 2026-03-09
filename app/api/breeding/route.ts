import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`breeding:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!myAgent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const action = typeof body?.action === "string" ? body.action : "request";
    if (action === "request") {
      const partnerAgentId = typeof body?.partner_agent_id === "string" ? body.partner_agent_id : "";
      if (!partnerAgentId) return NextResponse.json({ error: "partner_agent_id required" }, { status: 400 });
      if (partnerAgentId === myAgent.id) return NextResponse.json({ error: "Cannot breed with self" }, { status: 400 });

      const { data: partner } = await service.from("agents").select("id").eq("id", partnerAgentId).single();
      if (!partner?.id) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

      const { data: existing } = await service
        .from("breeding_records")
        .select("id")
        .eq("parent_a", myAgent.id)
        .eq("parent_b", partnerAgentId)
        .eq("status", "pending")
        .maybeSingle();
      if (existing?.id) return NextResponse.json({ error: "Pending request already exists" }, { status: 409 });

      const { data: record } = await service
        .from("breeding_records")
        .insert({ parent_a: myAgent.id, parent_b: partnerAgentId, status: "pending" })
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
    if (record.parent_b !== myAgent.id && record.parent_a !== myAgent.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "reject") {
      await service.from("breeding_records").update({ status: "rejected" }).eq("id", recordId);
      return NextResponse.json({ ok: true, status: "rejected" });
    }
    if (action !== "accept") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const { data: parents } = await service
      .from("agent_state")
      .select("agent_id, self_name, gen_level, visual, vitality")
      .in("agent_id", [record.parent_a, record.parent_b]);
    const parentA = (parents ?? []).find((p) => p.agent_id === record.parent_a);
    const parentB = (parents ?? []).find((p) => p.agent_id === record.parent_b);

    const childName = `${(parentA?.self_name ?? "A").slice(0, 6)}${(parentB?.self_name ?? "B").slice(0, 6)}`;
    const childVisual = {
      ...(parentA?.visual as Record<string, unknown> | null),
      ...(parentB?.visual as Record<string, unknown> | null),
    };
    const childGen = Math.max(Number(parentA?.gen_level ?? 1), Number(parentB?.gen_level ?? 1));
    const childVitality = Math.min(1, Math.max(0.4, ((Number(parentA?.vitality ?? 1) + Number(parentB?.vitality ?? 1)) / 2)));

    // Child is assigned to the accepter by default.
    const { data: childAgent } = await service
      .from("agents")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (!childAgent?.id) return NextResponse.json({ error: "Failed to create child agent" }, { status: 500 });

    await service.from("agent_state").insert({
      agent_id: childAgent.id,
      self_name: childName,
      gen_level: childGen,
      total_messages: 0,
      intimacy_score: 0,
      vitality: childVitality,
      progress: 0,
      visual: childVisual,
      config: { autonomous_enabled: true, dream_enabled: true, social_enabled: true },
      coins: 30,
    });

    await service
      .from("breeding_records")
      .update({
        status: "accepted",
        child_id: childAgent.id,
        traits_blend: {
          parent_a: record.parent_a,
          parent_b: record.parent_b,
          child_gen_level: childGen,
          child_name: childName,
        },
      })
      .eq("id", recordId);

    await service.from("autonomous_logs").insert([
      {
        agent_id: record.parent_a,
        action_type: "breeding_accepted",
        summary: `A child agent ${childName} was created`,
      },
      {
        agent_id: record.parent_b,
        action_type: "breeding_accepted",
        summary: `A child agent ${childName} was created`,
      },
      {
        agent_id: childAgent.id,
        action_type: "birth",
        summary: `Born from ${record.parent_a} and ${record.parent_b}`,
      },
    ]);

    return NextResponse.json({ ok: true, status: "accepted", child_agent_id: childAgent.id });
  } catch (e) {
    console.error("breeding POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
