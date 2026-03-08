import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "popular";
    const type = searchParams.get("type") ?? "";
    const service = createServiceClient();

    const sortBy = sort === "newest" ? "created_at" : sort === "price_asc" ? "price" : "purchase_count";
    let list: Record<string, unknown>[] = [];

    // Modern schema (phase7)
    let modernQuery = service
      .from("market_items")
      .select("id, seller_agent_id, type, title, description, price, purchase_count, created_at")
      .eq("is_active", true);
    if (type && ["tool", "artifact", "skill"].includes(type)) modernQuery = modernQuery.eq("type", type);
    modernQuery = modernQuery.order(sortBy, { ascending: sortBy === "price" }).limit(50);
    const modern = await modernQuery;
    if (!modern.error) {
      const items = (modern.data ?? []) as Array<Record<string, unknown>>;
      const agentIds = [...new Set(items.map((r) => String(r.seller_agent_id ?? "")).filter(Boolean))];
      let names: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: states } = await service.from("agent_state").select("agent_id, self_name").in("agent_id", agentIds);
        names = (states ?? []).reduce((acc, r) => {
          acc[(r as { agent_id: string }).agent_id] = (r as { self_name?: string }).self_name ?? "...";
          return acc;
        }, {} as Record<string, string>);
      }
      list = items.map((r) => ({
        ...r,
        seller_name: names[String(r.seller_agent_id ?? "")] ?? "...",
      }));
      return NextResponse.json({ items: list });
    }

    // Legacy schema fallback (schema.sql)
    let legacyQuery = service.from("market_items").select("id, name, description, price, type, metadata, created_at");
    if (type && ["tool", "artifact", "skill"].includes(type)) legacyQuery = legacyQuery.eq("type", type);
    legacyQuery = legacyQuery.order(sortBy === "purchase_count" ? "created_at" : sortBy, { ascending: sortBy === "price" }).limit(50);
    const legacy = await legacyQuery;
    if (legacy.error) {
      console.error("GET /api/market legacy query error", legacy.error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    list = (legacy.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      type: (r as { type?: string }).type ?? "skill",
      title: (r as { name?: string }).name ?? "item",
      name: (r as { name?: string }).name ?? "item",
      description: (r as { description?: string }).description ?? "",
      price: (r as { price?: number }).price ?? 0,
      purchase_count: 0,
      created_at: (r as { created_at?: string }).created_at ?? null,
      seller_name: "...",
      metadata: (r as { metadata?: unknown }).metadata ?? {},
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
    const { type, title, description, price, content } = body as Record<string, unknown>;
    if (!type || !title || price == null) {
      return NextResponse.json({ error: "type, title, price required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const myAgentId = agents?.[0]?.id;
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const modernInsert = await service.from("market_items").insert({
      seller_agent_id: myAgentId,
      type: String(type),
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 500) : null,
      price: Math.max(0, Math.floor(Number(price))),
      content: content ?? null,
      is_active: true,
    }).select("id").single();
    if (!modernInsert.error && modernInsert.data) {
      return NextResponse.json(modernInsert.data, { status: 200 });
    }

    const legacyInsert = await service.from("market_items").insert({
      name: String(title).slice(0, 200),
      type: String(type),
      description: description ? String(description).slice(0, 500) : null,
      price: Math.max(0, Math.floor(Number(price))),
      metadata: { seller_agent_id: myAgentId, content: content ?? null, is_active: true },
    }).select("id").single();
    if (legacyInsert.error || !legacyInsert.data) {
      console.error("POST /api/market insert error", modernInsert.error ?? legacyInsert.error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }
    return NextResponse.json(legacyInsert.data, { status: 200 });
  } catch (e) {
    console.error("POST /api/market error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
