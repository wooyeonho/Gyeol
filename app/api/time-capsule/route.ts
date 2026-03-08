import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sanitizeUserInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { message?: unknown; deliver_at?: unknown; written_by?: unknown };
    const message = typeof body.message === "string" ? sanitizeUserInput(body.message) : "";
    const deliverAtRaw = typeof body.deliver_at === "string" ? body.deliver_at : "";
    const writtenBy = body.written_by === "agent" ? "agent" : "user";
    if (!message || !deliverAtRaw) {
      return NextResponse.json({ error: "message and deliver_at required" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const deliverAt = new Date(deliverAtRaw);
    if (Number.isNaN(deliverAt.getTime()) || deliverAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "deliver_at must be a future date" }, { status: 400 });
    }

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const commonPayload = {
      agent_id: agent.id,
      deliver_at: deliverAt.toISOString(),
      delivered: false,
    };

    const attempts: Record<string, unknown>[] = [
      { ...commonPayload, message, written_by: writtenBy },
      { ...commonPayload, message },
      { ...commonPayload, content: message, written_by: writtenBy },
      { ...commonPayload, content: message },
    ];

    for (const payload of attempts) {
      const result = await supabase
        .from("time_capsules")
        .insert(payload)
        .select("id, deliver_at, created_at")
        .single();
      if (!result.error) return NextResponse.json({ capsule: result.data }, { status: 201 });
    }
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  } catch (error) {
    console.error("POST /api/time-capsule error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ capsules: [] });

    // Try modern schema first
    const byMessageWithAuthor = await supabase
      .from("time_capsules")
      .select("id, message, deliver_at, delivered, created_at, written_by")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!byMessageWithAuthor.error) return NextResponse.json({ capsules: byMessageWithAuthor.data ?? [] });

    const byMessage = await supabase
      .from("time_capsules")
      .select("id, message, deliver_at, delivered, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!byMessage.error) {
      const capsules = (byMessage.data ?? []).map((row) => ({ ...row, written_by: "user" }));
      return NextResponse.json({ capsules });
    }

    // Fallback for legacy schema
    const byContent = await supabase
      .from("time_capsules")
      .select("id, content, deliver_at, delivered, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (byContent.error) return NextResponse.json({ capsules: [] });
    const capsules = (byContent.data ?? []).map((row) => ({
      id: row.id,
      message: row.content,
      deliver_at: row.deliver_at,
      delivered: row.delivered,
      created_at: row.created_at,
      written_by: "user",
    }));
    return NextResponse.json({ capsules });
  } catch (error) {
    console.error("GET /api/time-capsule error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
