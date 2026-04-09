import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody, marketListingBodySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "popular";
    const type = searchParams.get("type") ?? "";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
    let sellerProfiles: Record<string, { visual?: unknown; genome?: unknown; config?: unknown; self_model?: unknown; gen_level?: number | null; vitality?: number | null }> = {};
    if (agentIds.length > 0) {
      const { data: states } = await service.from("agent_state").select("agent_id, self_name, visual, genome, config, self_model, gen_level, vitality").in("agent_id", agentIds);
      names = (states ?? []).reduce((acc, r) => {
        acc[(r as { agent_id: string }).agent_id] = (r as { self_name?: string }).self_name ?? "...";
        return acc;
      }, {} as Record<string, string>);
      sellerProfiles = (states ?? []).reduce((acc, r) => {
        const row = r as {
          agent_id: string;
          visual?: unknown;
          genome?: unknown;
          config?: unknown;
          self_model?: unknown;
          gen_level?: number | null;
          vitality?: number | null;
        };
        acc[row.agent_id] = {
          visual: row.visual,
          genome: row.genome,
          config: row.config,
          self_model: row.self_model,
          gen_level: row.gen_level ?? 1,
          vitality: row.vitality ?? 1,
        };
        return acc;
      }, {} as Record<string, { visual?: unknown; genome?: unknown; config?: unknown; self_model?: unknown; gen_level?: number | null; vitality?: number | null }>);
    }
    let currentAgent: {
      self_name: string | null;
      visual: unknown;
      genome: unknown;
      config: { usage_profile?: unknown } | null;
      self_model: unknown;
      gen_level: number;
      vitality: number;
    } | null = null;
    if (user) {
      const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
      const myAgentId = agents?.[0]?.id;
      if (myAgentId) {
        const { data: myState } = await service
          .from("agent_state")
          .select("self_name, visual, genome, config, self_model, gen_level, vitality")
          .eq("agent_id", myAgentId)
          .single();
        const state = myState as {
          self_name?: string | null;
          visual?: unknown;
          genome?: unknown;
          config?: { usage_profile?: unknown } | null;
          self_model?: unknown;
          gen_level?: number | null;
          vitality?: number | null;
        } | null;
        currentAgent = state
          ? {
              self_name: state.self_name ?? null,
              visual: state.visual ?? null,
              genome: state.genome ?? null,
              config: { usage_profile: state.config?.usage_profile ?? null },
              self_model: state.self_model ?? null,
              gen_level: state.gen_level ?? 1,
              vitality: state.vitality ?? 1,
            }
          : null;
      }
    }
    const list = (items ?? []).map((r) => ({
      ...r,
      seller_name: names[(r as { seller_agent_id: string }).seller_agent_id] ?? "...",
      seller_visual: sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.visual ?? null,
      seller_genome: sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.genome ?? null,
      seller_config: {
        usage_profile:
          (sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.config as { usage_profile?: unknown } | undefined)?.usage_profile ?? null,
      },
      seller_self_model: sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.self_model ?? null,
      seller_gen_level: sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.gen_level ?? 1,
      seller_vitality: sellerProfiles[(r as { seller_agent_id: string }).seller_agent_id]?.vitality ?? 1,
    }));

    if (currentAgent?.config?.usage_profile) {
      const myPrimaryMode = (currentAgent.config.usage_profile as { primary_mode?: string }).primary_mode;
      if (myPrimaryMode) {
        list.sort((a, b) => {
          let aScore = (a.purchase_count as number) || 0;
          let bScore = (b.purchase_count as number) || 0;
          
          const aMode = (a.seller_config?.usage_profile as { primary_mode?: string })?.primary_mode;
          const bMode = (b.seller_config?.usage_profile as { primary_mode?: string })?.primary_mode;
          
          if (aMode === myPrimaryMode) aScore += 100;
          if (bMode === myPrimaryMode) bScore += 100;
          
          return bScore - aScore;
        });
      }
    }

    return NextResponse.json({ items: list, currentAgent });
  } catch (e) {
    logRouteError("GET /api/market error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const parsed = await parseBody(request, marketListingBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { seller_agent_id, type, title, description, price, content } = parsed.data;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`market:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const myAgentId = agents?.[0]?.id;
    if (myAgentId !== seller_agent_id) return NextResponse.json({ error: "Not your agent" }, { status: 403 });
    const { data: row } = await service.from("market_items").insert({
      seller_agent_id,
      type,
      title,
      description: description ?? null,
      price,
      content: content ?? null,
      is_active: true,
    }).select("id").single();
    return NextResponse.json(row ?? { error: "Insert failed" }, row ? { status: 200 } : { status: 500 });
  } catch (e) {
    logRouteError("POST /api/market error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
