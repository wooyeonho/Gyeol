import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";

type Decision = "approved" | "rejected" | "cancelled";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = await checkRateLimit(`autonomy-proposal-patch:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const status = body?.status as Decision;
    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const reviewNote = typeof body?.review_note === "string" ? body.review_note.trim().slice(0, 300) : null;

    const service = createServiceClient();
    const { data: proposal } = await service
      .from("autonomy_proposals")
      .select("id, user_id, agent_id, status, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (proposal.status === "executed") {
      return NextResponse.json({ error: "Already executed" }, { status: 409 });
    }

    const { data: updated, error } = await service
      .from("autonomy_proposals")
      .update({
        status,
        review_note: reviewNote,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status, review_note, reviewed_at")
      .single();
    if (error) {
      console.error("autonomy proposal patch", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    await service.from("autonomy_action_logs").insert({
      proposal_id: id,
      user_id: user.id,
      agent_id: proposal.agent_id,
      action: status,
      detail: proposal.title,
      payload: { review_note: reviewNote },
    });

    return NextResponse.json({ ok: true, proposal: updated });
  } catch (e) {
    console.error("autonomy/proposals/[id] PATCH", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
