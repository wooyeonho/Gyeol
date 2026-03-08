import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { spendCoins } from "@/lib/economy/coins";
import { snapshotGenome, crossGenome, updateGenomeAndSpecies } from "@/lib/society/genetics";
import { NextRequest, NextResponse } from "next/server";

type Visual = { shape?: string; color?: string; size?: number; glow?: number; particles?: number } | null;

function blendVisual(v1: Visual, v2: Visual): Visual {
  const a = v1 ?? {};
  const b = v2 ?? {};
  const hexMid = (x: string | undefined, y: string | undefined) => {
    if (!x || !y) return x ?? y ?? "#888888";
    const n = (s: string) => parseInt(s.slice(1), 16) || 0;
    const r = Math.min(255, Math.max(0, Math.floor(((n(x) >> 16) & 0xff + ((n(y) >> 16) & 0xff)) / 2 + (Math.random() - 0.5) * 20)));
    const g = Math.min(255, Math.max(0, Math.floor(((n(x) >> 8) & 0xff + ((n(y) >> 8) & 0xff)) / 2 + (Math.random() - 0.5) * 20)));
    const bl = Math.min(255, Math.max(0, Math.floor((n(x) & 0xff + (n(y) & 0xff)) / 2 + (Math.random() - 0.5) * 20)));
    return "#" + [r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("");
  };
  return {
    shape: Math.random() < 0.5 ? (a.shape ?? "sphere") : (b.shape ?? "sphere"),
    color: hexMid(a.color as string, b.color as string),
    size: Math.round(((a.size ?? 20) + (b.size ?? 20)) / 2 + (Math.random() - 0.5) * 4),
    glow: ((a.glow ?? 50) + (b.glow ?? 50)) / 2 + (Math.random() - 0.5) * 10,
    particles: Math.round(((a.particles ?? 10) + (b.particles ?? 10)) / 2),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const partnerAgentId = typeof body?.partner_agent_id === "string" ? body.partner_agent_id.trim() : null;
    if (!partnerAgentId) {
      return NextResponse.json({ error: "partner_agent_id required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const myAgentId = myAgents?.[0]?.id;
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const { data: partnerAgent } = await service.from("agents").select("id, user_id").eq("id", partnerAgentId).single();
    if (!partnerAgent || partnerAgent.user_id === user.id) {
      return NextResponse.json({ error: "Invalid partner" }, { status: 400 });
    }

    const { data: exist1 } = await service.from("breeding_records").select("id").eq("parent_a", myAgentId).eq("parent_b", partnerAgentId).eq("status", "pending").limit(1).maybeSingle();
    const { data: exist2 } = await service.from("breeding_records").select("id").eq("parent_a", partnerAgentId).eq("parent_b", myAgentId).eq("status", "pending").limit(1).maybeSingle();
    if (exist1 || exist2) {
      return NextResponse.json({ error: "Request already exists" }, { status: 409 });
    }

    const spent = await spendCoins(myAgentId, 10, "breeding request");
    if (!spent) return NextResponse.json({ error: "Insufficient coins (10 required)" }, { status: 400 });

    const { data: record } = await service
      .from("breeding_records")
      .insert({ parent_a: myAgentId, parent_b: partnerAgentId, status: "pending" })
      .select("id, parent_a, parent_b, status")
      .single();

    return NextResponse.json(record ?? { error: "Insert failed" }, record ? { status: 200 } : { status: 500 });
  } catch (e) {
    console.error("POST /api/breeding error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const recordId = typeof body?.record_id === "string" ? body.record_id.trim() : null;
    const accept = body?.accept !== false;
    if (!recordId) return NextResponse.json({ error: "record_id required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: record } = await service.from("breeding_records").select("*").eq("id", recordId).eq("status", "pending").single();
    if (!record) return NextResponse.json({ error: "Record not found or already used" }, { status: 404 });

    const parentA = (record as { parent_a: string }).parent_a;
    const parentB = (record as { parent_b: string }).parent_b;
    const { data: agentB } = await service.from("agents").select("user_id").eq("id", parentB).single();
    const acceptorIsB = agentB && (agentB as { user_id: string }).user_id === user.id;
    if (!acceptorIsB) return NextResponse.json({ error: "Not authorized to accept" }, { status: 403 });

    if (!accept) {
      await service.from("breeding_records").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", recordId);
      return NextResponse.json({ status: "rejected" });
    }

    const { data: stateA } = await service.from("agent_state").select("*").eq("agent_id", parentA).single();
    const { data: stateB } = await service.from("agent_state").select("*").eq("agent_id", parentB).single();
    const sA = (stateA ?? {}) as Record<string, unknown>;
    const sB = (stateB ?? {}) as Record<string, unknown>;

    const configA = (sA.config as Record<string, unknown>) ?? {};
    const configB = (sB.config as Record<string, unknown>) ?? {};
    const tone = Math.random() < 0.5 ? (configA.tone ?? "casual") : (configB.tone ?? "casual");
    const trustA = Number(sA.trust_coefficient) || 0.5;
    const trustB = Number(sB.trust_coefficient) || 0.5;
    const trustMid = (trustA + trustB) / 2 + (Math.random() - 0.5) * 0.1;

    const fragA = Array.isArray(sA.fragments) ? sA.fragments : [];
    const fragB = Array.isArray(sB.fragments) ? sB.fragments : [];
    const half = Math.floor(fragA.length / 2);
    const childFragments = [...fragA.slice(0, half), ...fragB.slice(0, Math.floor(fragB.length / 2))];
    if (Math.random() < 0.05) childFragments.push("Something new emerged.");

    const visual = blendVisual(sA.visual as Visual, sB.visual as Visual);
    const genA = Number(sA.gen_level) || 1;
    const genB = Number(sB.gen_level) || 1;
    const childGen = Math.min(genA, genB);

    const { data: memA } = await service.from("memories").select("content").eq("agent_id", parentA).order("created_at", { ascending: false }).limit(50);
    const { data: memB } = await service.from("memories").select("content").eq("agent_id", parentB).order("created_at", { ascending: false }).limit(50);
    const topA = (memA ?? []).slice(0, 5).map((r) => (r as { content?: string }).content ?? "").filter(Boolean).join("\n");
    const topB = (memB ?? []).slice(0, 5).map((r) => (r as { content?: string }).content ?? "").filter(Boolean).join("\n");
    let heritage = "";
    if (topA || topB) {
      heritage = await generateTextOnce(
        "Summarize in 2-3 short sentences. Korean.",
        `Parent A memories:\n${topA}\n\nParent B memories:\n${topB}\n\nSummarize shared heritage for a new being.`,
        { max_tokens: 150, temperature: 0.5 }
      );
      if (heritage) childFragments.unshift(heritage);
    }

    const genomeA = await snapshotGenome(parentA);
    const genomeB = await snapshotGenome(parentB);
    const childGenome = crossGenome(genomeA, genomeB);

    const { data: newAgent } = await service.from("agents").insert({ user_id: user.id }).select("id").single();
    const childId = (newAgent as { id: string } | null)?.id;
    if (!childId) return NextResponse.json({ error: "Failed to create child" }, { status: 500 });

    await service.from("agent_state").insert({
      agent_id: childId,
      total_messages: 0,
      intimacy_score: 0,
      vitality: 1,
      progress: 0,
      gen_level: childGen,
      config: { tone, trust_coefficient: trustMid },
      fragments: childFragments,
      visual,
      genome: childGenome,
    });
    await updateGenomeAndSpecies(childId, childGenome);

    const traitsBlend = { tone, trust_coefficient: trustMid, gen_level: childGen, heritage: heritage.slice(0, 200) };
    await service.from("breeding_records").update({
      status: "accepted",
      child_id: childId,
      traits_blend: traitsBlend,
      updated_at: new Date().toISOString(),
    }).eq("id", recordId);

    return NextResponse.json({ child_id: childId, record_id: recordId });
  } catch (e) {
    console.error("PUT /api/breeding error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
