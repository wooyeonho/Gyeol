import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const metric = req.nextUrl.searchParams.get("metric") ?? "coins";
    const allowedMetrics = new Set(["coins", "vitality", "gen_level", "total_messages", "intimacy_score"]);
    const orderBy = allowedMetrics.has(metric) ? metric : "coins";
    const limit = Math.max(1, Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 30)));

    const service = createServiceClient();
    const [{ data: states }, { data: myAgent }] = await Promise.all([
      service
        .from("agent_state")
        .select("agent_id, self_name, vitality, coins, gen_level, total_messages, intimacy_score")
        .order(orderBy, { ascending: false })
        .limit(limit),
      service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
    ]);

    const myAgentId = myAgent?.id ?? null;
    const rankings = (states ?? []).map((state, index) => ({
      rank: index + 1,
      is_me: myAgentId != null && state.agent_id === myAgentId,
      ...state,
    }));

    return NextResponse.json({ metric: orderBy, rankings });
  } catch (error) {
    console.error("GET /api/rankings error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
