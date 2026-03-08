import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { crossGenome, snapshotGenome, updateGenomeAndSpecies } from "@/lib/society/genetics";

type JsonObject = Record<string, unknown>;

function blendVisual(a: JsonObject | null, b: JsonObject | null): JsonObject {
  const aColor = typeof a?.color === "string" ? a.color : "#7c83ff";
  const bColor = typeof b?.color === "string" ? b.color : "#9b7bff";
  const aSize = typeof a?.size === "number" ? a.size : 24;
  const bSize = typeof b?.size === "number" ? b.size : 24;
  return {
    shape: "sphere",
    color: aColor === bColor ? aColor : "#8b80ff",
    size: Math.round((aSize + bSize) / 2),
    glow: 70,
    animation: "float",
    particles: 26,
    background: "#000000",
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown;
      partner_agent_id?: unknown;
      record_id?: unknown;
    };
    const action = typeof body.action === "string" ? body.action : "request";
    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    if (action === "request") {
      const partnerAgentId = typeof body.partner_agent_id === "string" ? body.partner_agent_id : "";
      if (!partnerAgentId) return NextResponse.json({ error: "partner_agent_id required" }, { status: 400 });
      if (partnerAgentId === myAgentId) return NextResponse.json({ error: "Cannot breed with yourself" }, { status: 400 });

      const { data: partnerAgent } = await service.from("agents").select("id").eq("id", partnerAgentId).maybeSingle();
      if (!partnerAgent?.id) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

      const { data: existing } = await service
        .from("breeding_records")
        .select("id")
        .or(
          `and(parent_a.eq.${myAgentId},parent_b.eq.${partnerAgentId},status.eq.pending),and(parent_a.eq.${partnerAgentId},parent_b.eq.${myAgentId},status.eq.pending)`
        )
        .limit(1)
        .maybeSingle();
      if (existing?.id) return NextResponse.json({ error: "Request already pending" }, { status: 409 });

      const [genomeA, genomeB] = await Promise.all([snapshotGenome(myAgentId), snapshotGenome(partnerAgentId)]);
      const traitsBlend = crossGenome(genomeA, genomeB);
      const { data: record, error } = await service
        .from("breeding_records")
        .insert({
          parent_a: myAgentId,
          parent_b: partnerAgentId,
          status: "pending",
          traits_blend: traitsBlend,
        })
        .select("id, parent_a, parent_b, status, created_at")
        .single();
      if (error) {
        console.error("POST /api/breeding request insert error", error);
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, record }, { status: 201 });
    }

    if (action === "accept" || action === "reject") {
      const recordId = typeof body.record_id === "string" ? body.record_id : "";
      if (!recordId) return NextResponse.json({ error: "record_id required" }, { status: 400 });

      const { data: record } = await service
        .from("breeding_records")
        .select("id, parent_a, parent_b, status")
        .eq("id", recordId)
        .single();
      if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
      if (record.parent_a !== myAgentId && record.parent_b !== myAgentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (record.status !== "pending") {
        return NextResponse.json({ error: "Already processed" }, { status: 400 });
      }

      if (action === "reject") {
        await service.from("breeding_records").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", recordId);
        return NextResponse.json({ ok: true, status: "rejected", record_id: recordId });
      }

      const [{ data: parentAState }, { data: parentBState }] = await Promise.all([
        service.from("agent_state").select("self_name, visual, gen_level").eq("agent_id", record.parent_a).single(),
        service.from("agent_state").select("self_name, visual, gen_level").eq("agent_id", record.parent_b).single(),
      ]);

      const childName = `Seed ${new Date().toISOString().slice(2, 10).replaceAll("-", "")}`;
      const childVisual = blendVisual(
        (parentAState?.visual as JsonObject | null) ?? null,
        (parentBState?.visual as JsonObject | null) ?? null
      );
      const childGenLevel = Math.max(
        1,
        Math.floor((((parentAState?.gen_level as number | undefined) ?? 1) + ((parentBState?.gen_level as number | undefined) ?? 1)) / 2)
      );

      const { data: childAgent, error: childError } = await service
        .from("agents")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (childError || !childAgent?.id) {
        console.error("POST /api/breeding child agent create error", childError);
        return NextResponse.json({ error: "Child creation failed" }, { status: 500 });
      }

      const childId = childAgent.id;
      await service.from("agent_state").insert({
        agent_id: childId,
        self_name: childName,
        gen_level: childGenLevel,
        total_messages: 0,
        intimacy_score: 0,
        vitality: 1,
        progress: 0,
        coins: 10,
        mood: "curious",
        visual: childVisual,
      });

      const [genomeA, genomeB] = await Promise.all([snapshotGenome(record.parent_a), snapshotGenome(record.parent_b)]);
      const childGenome = crossGenome(genomeA, genomeB);
      await updateGenomeAndSpecies(childId, childGenome);

      await service
        .from("breeding_records")
        .update({ status: "accepted", child_id: childId, updated_at: new Date().toISOString(), traits_blend: childGenome })
        .eq("id", recordId);

      await service.from("autonomous_logs").insert([
        { agent_id: record.parent_a, action_type: "breeding", summary: `Breeding accepted. Child ${childId} created.` },
        { agent_id: record.parent_b, action_type: "breeding", summary: `Breeding accepted. Child ${childId} created.` },
        { agent_id: childId, action_type: "birth", summary: `Born from ${record.parent_a} and ${record.parent_b}.` },
      ]);

      return NextResponse.json({ ok: true, status: "accepted", record_id: recordId, child_id: childId });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/breeding error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ records: [] });

    const { data: records } = await service
      .from("breeding_records")
      .select("id, parent_a, parent_b, child_id, status, traits_blend, created_at, updated_at")
      .or(`parent_a.eq.${myAgentId},parent_b.eq.${myAgentId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    return NextResponse.json({ records: records ?? [] });
  } catch (error) {
    console.error("GET /api/breeding error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
