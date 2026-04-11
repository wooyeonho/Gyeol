import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { recordActivity, ensureLeagueEnrollment } from "@/lib/engagement/streak-xp";

/**
 * POST /api/home/daily-bonus
 * Claim today's daily login bonus (once per UTC day).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const todayUtc = new Date().toISOString().slice(0, 10);

  // Check if already claimed today
  const { data: existing } = await service
    .from("daily_bonuses")
    .select("id")
    .eq("user_id", user.id)
    .gte("claimed_at", `${todayUtc}T00:00:00Z`)
    .lt("claimed_at", `${todayUtc}T23:59:59Z`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already claimed today", alreadyClaimed: true }, { status: 409 });
  }

  // Calculate current day index in the 7-day cycle
  const { count } = await service
    .from("daily_bonuses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const dayIndex = ((count ?? 0) % 7) + 1;

  // Determine reward by day
  const REWARDS = [
    { type: "coins", amount: 10 },
    { type: "xp", amount: 50 },
    { type: "coins", amount: 20 },
    { type: "streak_shield", amount: 1 },
    { type: "coins", amount: 30 },
    { type: "xp", amount: 150 },
    { type: "coins", amount: 100 },
  ] as const;

  const reward = REWARDS[dayIndex - 1];

  // Get current streak for logging
  const { data: agent } = await service
    .from("agents")
    .select("streak_days")
    .eq("user_id", user.id)
    .maybeSingle();

  // Insert claim record
  const { error: insertErr } = await service.from("daily_bonuses").insert({
    user_id: user.id,
    day_index: dayIndex,
    reward_type: reward.type,
    reward_amount: reward.amount,
    streak_day: (agent as { streak_days?: number } | null)?.streak_days ?? 1,
  });

  if (insertErr) {
    return NextResponse.json({ error: "Failed to record bonus" }, { status: 500 });
  }

  // Apply reward
  if (reward.type === "coins") {
    await service.rpc("add_coins", { p_user_id: user.id, p_amount: reward.amount }).throwOnError();
  }

  // Advance streak and award XP — daily login is the canonical "show up" activity.
  let engagement = null;
  try {
    await ensureLeagueEnrollment(user.id);
    const xp = reward.type === "xp" ? reward.amount : undefined;
    engagement = await recordActivity(user.id, "daily:login", xp);
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    dayIndex,
    reward: { type: reward.type, amount: reward.amount },
    engagement,
  });
}

/**
 * GET /api/home/daily-bonus
 * Check today's bonus claim status.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const todayUtc = new Date().toISOString().slice(0, 10);

  const { data: existing } = await service
    .from("daily_bonuses")
    .select("id, day_index")
    .eq("user_id", user.id)
    .gte("claimed_at", `${todayUtc}T00:00:00Z`)
    .maybeSingle();

  const { count } = await service
    .from("daily_bonuses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const nextDayIndex = ((count ?? 0) % 7) + 1;

  return NextResponse.json({
    alreadyClaimed: !!existing,
    currentDayIndex: nextDayIndex,
  });
}
