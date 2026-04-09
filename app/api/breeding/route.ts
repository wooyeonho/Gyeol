import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { breedingBodySchema, parseBody } from "@/lib/validation/schemas";
import { getPrimaryAgent } from "@/lib/agents/primary";
import { breedCreatures } from "@/lib/genome/dna";
import type { CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/breeding" });

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`breeding:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const parsed = await parseBody(req, breedingBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { action, partner_agent_id, record_id } = parsed.data;

    const service = createServiceClient();
    const { agentId: myAgentId } = await getPrimaryAgent(service, user.id);
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    if (action === "request") {
      const partnerAgentId = partner_agent_id ?? "";
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

    const recordId = record_id ?? "";
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

    // Only the receiving party (parent_b) can accept — prevents requester self-accept
    if (record.parent_b !== myAgentId) {
      return NextResponse.json({ error: "Only the receiving party can accept a breeding request" }, { status: 403 });
    }

    // ── Breeding accept: DNA crossover + create offspring agent ──
    // Fetch both parents' genome (DNA) and gen_level
    const [parentAState, parentBState] = await Promise.all([
      service.from("agent_state").select("genome, gen_level").eq("agent_id", record.parent_a).single(),
      service.from("agent_state").select("genome, gen_level").eq("agent_id", record.parent_b).single(),
    ]);
    const dnaA = (parentAState.data?.genome as Record<string, unknown>)?.dna as CreatureDNA | undefined;
    const dnaB = (parentBState.data?.genome as Record<string, unknown>)?.dna as CreatureDNA | undefined;
    if (!dnaA || !dnaB) {
      return NextResponse.json({ error: "Parent DNA not found — both parents must have genome data" }, { status: 422 });
    }
    const parentGenLevel = Math.max(
      (parentAState.data?.gen_level as number) ?? 1,
      (parentBState.data?.gen_level as number) ?? 1,
    );
    const { dna: childDna, mutatedAxes } = breedCreatures(dnaA, dnaB, parentGenLevel);
    const childSpecies = deriveSpecies(childDna);

    // Create the offspring agent under the accepting user
    const { data: childAgent, error: childErr } = await service
      .from("agents")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (childErr || !childAgent) {
      return NextResponse.json({ error: "Failed to create offspring agent" }, { status: 500 });
    }

    // Initialize offspring agent_state with bred DNA + species metadata at gen_level 1
    await service.from("agent_state").insert({
      agent_id: childAgent.id,
      gen_level: 1,
      genome: {
        dna: childDna,
        species: childSpecies.name,
        archetype: childSpecies.archetype,
        element: childSpecies.element,
      },
      vitality: 1,
      progress: 0,
      total_messages: 0,
      intimacy_score: 0,
    });

    // Update breeding record with child reference and traits blend
    await service.from("breeding_records").update({
      status: "accepted",
      child_id: childAgent.id,
      traits_blend: { childDna, mutatedAxes, parentGenLevel },
    }).eq("id", recordId);

    return NextResponse.json({
      ok: true,
      status: "accepted",
      child_id: childAgent.id,
      mutated_axes: mutatedAxes,
    });
  } catch (e) {
    log.error("breeding POST", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
