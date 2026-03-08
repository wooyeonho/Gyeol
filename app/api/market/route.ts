import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "popular";
    const type = searchParams.get("type") ?? "";
    const service = createServiceClient();
    let query = service.from("market_items").select("id, seller_agent_id, type, title, description, price, purchase_count, created_at").eq("is_active", true);
    if (type && ["tool", "artifact", "skill"].includes(type)) {
      query = query.eq("type", type);
    }
    if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else {
      query = query.order("purchase_count", { ascending: false });
    }
    const { data: items } = await query.limit(50);
    const agentIds = [...new Set((items ?? []).map((r) => (r as { seller_agent_id: string }).seller_agent_id))];
    let names: Record<string, string> = {};
    if (agentIds.length > 0) {
      const { data: states } = await service.from("agent_state").select("agent_id, self_name").in("agent_id", agentIds);
      names = (states ?? []).reduce((acc, r) => {
        acc[(r as { agent_id: string }).agent_id] = (r as { self_name?: string }).self_name ?? "...";
        return acc;
      }, {} as Record<string, string>);
    }
    const list = (items ?? []).map((r) => ({
      ...r,
      seller_name: names[(r as { seller_agent_id: string }).seller_agent_id] ?? "...",
    }));
    return NextResponse.json({ items: list });
  } catch (e) {
    console.error("GET /api/market error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { seller_agent_id, type, title, description, price, content } = body;
    if (!seller_agent_id || !type || !title || price == null) {
      return NextResponse.json({ error: "seller_agent_id, type, title, price required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const myAgentId = agents?.[0]?.id;
    if (myAgentId !== seller_agent_id) return NextResponse.json({ error: "Not your agent" }, { status: 403 });
    const { data: row } = await service.from("market_items").insert({
      seller_agent_id: seller_agent_id,
      type: String(type),
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 500) : null,
      price: Math.max(0, Math.floor(Number(price))),
      content: content ?? null,
      is_active: true,
    }).select("id").single();
    return NextResponse.json(row ?? { error: "Insert failed" }, row ? { status: 200 } : { status: 500 });
  } catch (e) {
    console.error("POST /api/market error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
