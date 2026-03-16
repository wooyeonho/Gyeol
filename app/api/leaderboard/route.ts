import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getTtlCache, setTtlCache } from "@/lib/cache/ttl";

export type LeaderboardEntry = {
  rank: number;
  agent_id: string;
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  visual: { color?: string; shape?: string } | null;
  config: { usage_profile?: { primary_mode?: string | null } | null } | null;
  is_self?: boolean;
  is_following?: boolean;
  is_followed_by?: boolean;
  is_mutual?: boolean;
};

export type LeaderboardContext = {
  self: LeaderboardEntry | null;
  nearby: LeaderboardEntry[];
};

export type LeaderboardResponse = {
  byLevel: LeaderboardEntry[];
  byMessages: LeaderboardEntry[];
  byVitality: LeaderboardEntry[];
  totalAgents: number;
  contexts: {
    level: LeaderboardContext;
    messages: LeaderboardContext;
    vitality: LeaderboardContext;
  };
};

type AgentRow = {
  agent_id?: string | null;
  self_name?: string | null;
  gen_level?: number | null;
  vitality?: number | null;
  total_messages?: number | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null } | null } | null;
};

function mapRows(
  rows: AgentRow[],
  selfAgentId?: string | null,
  relationSets?: {
    following: Set<string>;
    followers: Set<string>;
  },
): LeaderboardEntry[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    agent_id: r.agent_id ?? `unknown-${i}`,
    self_name: r.self_name ?? null,
    gen_level: r.gen_level ?? 1,
    vitality: r.vitality ?? 1,
    total_messages: r.total_messages ?? 0,
    visual: (r.visual as LeaderboardEntry["visual"]) ?? null,
    config: (r.config as LeaderboardEntry["config"]) ?? null,
    is_self: Boolean(selfAgentId && r.agent_id === selfAgentId),
    is_following: Boolean(relationSets?.following.has(r.agent_id ?? "")),
    is_followed_by: Boolean(relationSets?.followers.has(r.agent_id ?? "")),
    is_mutual: Boolean(relationSets?.following.has(r.agent_id ?? "") && relationSets?.followers.has(r.agent_id ?? "")),
  }));
}

function buildContext(entries: LeaderboardEntry[], selfAgentId?: string | null): LeaderboardContext {
  if (!selfAgentId) {
    return { self: null, nearby: [] };
  }

  const index = entries.findIndex((entry) => entry.agent_id === selfAgentId);
  if (index === -1) {
    return { self: null, nearby: [] };
  }

  const start = Math.max(0, index - 2);
  const end = Math.min(entries.length, index + 3);
  return {
    self: entries[index] ?? null,
    nearby: entries.slice(start, end),
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cacheKey = `leaderboard:${user?.id ?? "guest"}`;
    const cached = getTtlCache<LeaderboardResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const service = createServiceClient();
    const selfAgentId = user ? (await ensurePrimaryAgent(service, user.id)).agentId : null;

    const [rowsResult, countResult, followingRes, followersRes] = await Promise.all([
      service
        .from("agent_state")
        .select("agent_id, self_name, gen_level, vitality, total_messages, visual, config")
        .limit(1000),
      service.from("agent_state").select("agent_id", { count: "exact", head: true }),
      selfAgentId
        ? service.from("social_connections").select("followee_agent_id").eq("follower_agent_id", selfAgentId)
        : Promise.resolve({ data: [] }),
      selfAgentId
        ? service.from("social_connections").select("follower_agent_id").eq("followee_agent_id", selfAgentId)
        : Promise.resolve({ data: [] }),
    ]);

    const rows = (rowsResult.data ?? []) as AgentRow[];
    const relationSets = {
      following: new Set(((followingRes.data ?? []) as Array<{ followee_agent_id: string }>).map((row) => row.followee_agent_id)),
      followers: new Set(((followersRes.data ?? []) as Array<{ follower_agent_id: string }>).map((row) => row.follower_agent_id)),
    };
    const byLevelAll = mapRows(
      [...rows].sort((a, b) => {
        const genDiff = Number(b.gen_level ?? 1) - Number(a.gen_level ?? 1);
        if (genDiff !== 0) return genDiff;
        return Number(b.total_messages ?? 0) - Number(a.total_messages ?? 0);
      }),
      selfAgentId,
      relationSets,
    );
    const byMessagesAll = mapRows(
      [...rows].sort((a, b) => Number(b.total_messages ?? 0) - Number(a.total_messages ?? 0)),
      selfAgentId,
      relationSets,
    );
    const byVitalityAll = mapRows(
      [...rows].sort((a, b) => {
        const vitalityDiff = Number(b.vitality ?? 1) - Number(a.vitality ?? 1);
        if (vitalityDiff !== 0) return vitalityDiff;
        return Number(b.gen_level ?? 1) - Number(a.gen_level ?? 1);
      }),
      selfAgentId,
      relationSets,
    );

    const response: LeaderboardResponse = {
      byLevel: byLevelAll.slice(0, 50),
      byMessages: byMessagesAll.slice(0, 50),
      byVitality: byVitalityAll.slice(0, 50),
      totalAgents: countResult.count ?? 0,
      contexts: {
        level: buildContext(byLevelAll, selfAgentId),
        messages: buildContext(byMessagesAll, selfAgentId),
        vitality: buildContext(byVitalityAll, selfAgentId),
      },
    };

    setTtlCache(cacheKey, response, 20_000);
    return NextResponse.json(response);
  } catch (e) {
    console.error("GET /api/leaderboard error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
