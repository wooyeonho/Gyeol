import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  checkNewAchievements,
  getAchievement,
  getVisibleAchievements,
  ACHIEVEMENTS,
} from "@/lib/engagement/achievements";
import { logRouteError } from "@/lib/ops/logger";

/**
 * GET /api/achievements — list user's achievements with progress
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    // Fetch user stats
    const { data: state } = await service
      .from("agent_state")
      .select("total_messages, streak_days, gen_level, coins, genome")
      .eq("agent_id", agent.id)
      .single();

    // Fetch unlocked achievements
    const { data: unlocked } = await service
      .from("agent_achievements")
      .select("achievement_id, unlocked_at, seen")
      .eq("agent_id", agent.id);

    const unlockedIds = (unlocked ?? []).map((u) => u.achievement_id);
    const mutationsCount = state?.genome?.mutations?.length ?? 0;

    // Check for newly unlocked
    const newlyUnlocked = checkNewAchievements(
      {
        total_messages: state?.total_messages ?? 0,
        streak_days: state?.streak_days ?? 0,
        gen_level: state?.gen_level ?? 1,
        mutations_count: mutationsCount,
      },
      unlockedIds,
    );

    // Insert newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      const rows = newlyUnlocked.map((id) => ({
        agent_id: agent.id,
        achievement_id: id,
        unlocked_at: new Date().toISOString(),
        seen: false,
      }));
      await service.from("agent_achievements").insert(rows);

      // Award rewards
      for (const id of newlyUnlocked) {
        const def = getAchievement(id);
        if (def?.reward.coins) {
          await service.rpc("add_coins_atomic", {
            p_agent_id: agent.id,
            p_amount: def.reward.coins,
            p_reason: `achievement:${id}`,
          });
        }
      }
    }

    const allUnlockedIds = [...unlockedIds, ...newlyUnlocked];
    const visible = getVisibleAchievements(allUnlockedIds);

    return NextResponse.json({
      achievements: visible.map((a) => ({
        ...a,
        unlocked: allUnlockedIds.includes(a.id),
        newly_unlocked: newlyUnlocked.includes(a.id),
      })),
      total_unlocked: allUnlockedIds.length,
      total_available: ACHIEVEMENTS.length,
    });
  } catch (e) {
    logRouteError("GET /api/achievements", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/achievements — mark achievements as seen
 */
export async function PATCH() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    await service
      .from("agent_achievements")
      .update({ seen: true })
      .eq("agent_id", agent.id)
      .eq("seen", false);

    return NextResponse.json({ ok: true });
  } catch (e) {
    logRouteError("PATCH /api/achievements", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
