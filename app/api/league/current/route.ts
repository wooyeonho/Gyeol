import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureLeagueEnrollment } from "@/lib/engagement/streak-xp";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/league/current" });

export type LeaguePlacement = {
  rank: number;
  user_id: string;
  weekly_xp: number;
  is_self: boolean;
  agent_name: string | null;
};

export type LeagueResponse = {
  cohort_id: string | null;
  tier: string;
  week_start: string;
  placements: LeaguePlacement[];
  self_rank: number | null;
  promotion_line: number;
  demotion_line: number;
};

/**
 * GET /api/league/current
 * Returns the user's current weekly league cohort + leaderboard.
 * Auto-enrolls the user into a bronze cohort if not already enrolled.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user has a placement for this week (non-fatal)
    await ensureLeagueEnrollment(user.id);

    const service = createServiceClient();

    // Find current cohort + tier
    const weekStart = new Date();
    // Monday of current ISO week (UTC)
    const day = weekStart.getUTCDay();
    const delta = day === 0 ? -6 : 1 - day;
    weekStart.setUTCDate(weekStart.getUTCDate() + delta);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: myPlacement } = await service
      .from("league_placements")
      .select("cohort_id, league_cohorts!inner(id, tier, week_start)")
      .eq("user_id", user.id)
      .eq("league_cohorts.week_start", weekStartStr)
      .maybeSingle();

    const cohortRow = myPlacement as
      | {
          cohort_id: string;
          league_cohorts: { id: string; tier: string; week_start: string } | null;
        }
      | null;

    if (!cohortRow?.cohort_id) {
      return NextResponse.json<LeagueResponse>({
        cohort_id: null,
        tier: "bronze",
        week_start: weekStartStr,
        placements: [],
        self_rank: null,
        promotion_line: 5,
        demotion_line: 25,
      });
    }

    const cohortId = cohortRow.cohort_id;
    const tier = cohortRow.league_cohorts?.tier ?? "bronze";

    const { data: placementRows } = await service
      .from("league_placements")
      .select("user_id, weekly_xp")
      .eq("cohort_id", cohortId)
      .order("weekly_xp", { ascending: false })
      .limit(30);

    const rows = (placementRows ?? []) as Array<{ user_id: string; weekly_xp: number }>;

    // Fetch display names for the users in the cohort via agents -> agent_state
    const userIds = rows.map((r) => r.user_id);
    const nameByUser = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: agents } = await service
        .from("agents")
        .select("id, user_id, agent_state(self_name)")
        .in("user_id", userIds);
      const agentRows = (agents ?? []) as unknown as Array<{
        user_id: string;
        agent_state: Array<{ self_name: string | null }> | { self_name: string | null } | null;
      }>;
      for (const row of agentRows) {
        if (nameByUser.has(row.user_id)) continue;
        const rel = row.agent_state;
        const selfName = Array.isArray(rel) ? (rel[0]?.self_name ?? null) : (rel?.self_name ?? null);
        nameByUser.set(row.user_id, selfName);
      }
    }

    const placements: LeaguePlacement[] = rows.map((row, index) => ({
      rank: index + 1,
      user_id: row.user_id,
      weekly_xp: row.weekly_xp,
      is_self: row.user_id === user.id,
      agent_name: nameByUser.get(row.user_id) ?? null,
    }));

    const selfRank = placements.find((p) => p.is_self)?.rank ?? null;

    return NextResponse.json<LeagueResponse>({
      cohort_id: cohortId,
      tier,
      week_start: weekStartStr,
      placements,
      self_rank: selfRank,
      promotion_line: 5,
      demotion_line: 25,
    });
  } catch (e) {
    log.error("GET /api/league/current error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
