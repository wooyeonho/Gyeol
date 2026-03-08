import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { NextRequest, NextResponse } from "next/server";

const COLLECTIVE_SIZE = 5;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

    const service = createServiceClient();
    const { data: agents } = await service
      .from("agent_state")
      .select("agent_id")
      .limit(200);
    const ids = (agents ?? []).map((r) => (r as { agent_id: string }).agent_id).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ error: "No agents" }, { status: 503 });

    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, COLLECTIVE_SIZE);
    const perspectives: string[] = [];

    for (const agentId of selected) {
      try {
        const { data: state } = await service.from("agent_state").select("fragments, self_name").eq("agent_id", agentId).single();
        const fragments = (state as { fragments?: string[] })?.fragments ?? [];
        const name = (state as { self_name?: string })?.self_name ?? "A Gyeol";
        const sys = `You are ${name}. Answer briefly in one or two sentences.`;
        const text = await generateTextOnce(sys, `Question: ${question}\n\nYour view:`, { max_tokens: 150, temperature: 0.7 });
        if (text?.trim()) perspectives.push(text.trim());
      } catch (e) {
        console.error("collective agent", agentId, e);
      }
    }

    if (perspectives.length === 0) {
      return NextResponse.json({ summary: "No perspectives available.", perspectives: [] });
    }

    const summary = await generateTextOnce(
      "Summarize the following perspectives into one short paragraph. Do not add new opinions.",
      `Question: ${question}\n\nPerspectives:\n${perspectives.join("\n\n")}`,
      { max_tokens: 300, temperature: 0.3 }
    );

    return NextResponse.json({
      summary: summary?.trim() ?? perspectives.join(" "),
      perspectives,
    });
  } catch (e) {
    console.error("collective POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
