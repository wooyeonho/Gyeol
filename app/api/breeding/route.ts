import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { snapshotGenome, crossGenome, updateGenomeAndSpecies } from "@/lib/society/genetics";
import { spendCoins } from "@/lib/economy/coins";
import { generateTextOnce } from "@/lib/ai/router";

const BREEDING_COST = 50;

type BreedingRecord = { id: string; agent_a_id: string; agent_b_id: string; status: string; created_at: string };

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ records: [] });

    const { data } = await service
      .from("breeding_records")
      .select("*")
      .or(`agent_a_id.eq.${agentData.id},agent_b_id.eq.${agentData.id}`)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ records: data || [] });
  } catch (e) {
    console.error("[BreedingGET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { partner_agent_id } = (await req.json()) as { partner_agent_id?: string };
    if (!partner_agent_id) return NextResponse.json({ error: "partner_agent_id required" }, { status: 400 });

    const service = createServiceClient();
    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ error: "No agent" }, { status: 404 });
    const myAgentId = agentData.id;

    if (myAgentId === partner_agent_id) {
      return NextResponse.json({ error: "자기 자신과는 번식할 수 없습니다" }, { status: 400 });
    }

    const { data: partnerState } = await service
      .from("agent_state")
      .select("agent_id, vitality, gen_level")
      .eq("agent_id", partner_agent_id)
      .single();
    if (!partnerState || (partnerState.vitality || 0) < 0.3) {
      return NextResponse.json({ error: "파트너 AI의 활력이 너무 낮습니다" }, { status: 400 });
    }

    const { data: myState } = await service
      .from("agent_state")
      .select("vitality, gen_level")
      .eq("agent_id", myAgentId)
      .single();
    if (!myState || (myState.vitality || 0) < 0.3) {
      return NextResponse.json({ error: "AI의 활력이 너무 낮습니다" }, { status: 400 });
    }

    const recent = await service
      .from("breeding_records")
      .select("id")
      .or(`agent_a_id.eq.${myAgentId},agent_b_id.eq.${myAgentId}`)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    if ((recent.data || []).length > 0) {
      return NextResponse.json({ error: "최근 7일 이내에 이미 번식했습니다" }, { status: 429 });
    }

    const spent = await spendCoins(myAgentId, BREEDING_COST, "번식 비용");
    if (!spent) return NextResponse.json({ error: `${BREEDING_COST} 코인이 필요합니다` }, { status: 402 });

    const [genomeA, genomeB] = await Promise.all([
      snapshotGenome(myAgentId),
      snapshotGenome(partner_agent_id),
    ]);
    const childGenome = crossGenome(genomeA, genomeB);

    const childName = await generateTextOnce(
      "너는 창의적인 이름 생성기야. 한국어 이름 하나만 출력해. 다른 설명 없이.",
      `부모 A 특성: ${JSON.stringify(genomeA.traits)}\n부모 B 특성: ${JSON.stringify(genomeB.traits)}\n이 AI 생명체의 이름을 지어줘.`,
      { max_tokens: 20, temperature: 0.9 }
    );

    const { data: record } = await service.from("breeding_records").insert({
      agent_a_id: myAgentId,
      agent_b_id: partner_agent_id,
      child_genome: childGenome,
      child_name: childName?.trim() || "새 존재",
      status: "pending",
    }).select("id, child_name").single();

    await service.from("autonomous_logs").insert({
      agent_id: myAgentId,
      action_type: "breeding",
      summary: `번식 요청 전송 → ${childName?.trim() || "새 존재"}`,
    });

    return NextResponse.json({
      success: true,
      record_id: record?.id,
      child_name: record?.child_name || childName?.trim(),
      child_genome: childGenome,
    });
  } catch (e) {
    console.error("[BreedingPOST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
