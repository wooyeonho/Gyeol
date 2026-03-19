import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  generateDailyChallenges,
  getTodayDateString,
  getTargetForCondition,
  getPerfectDayBonus,
} from "@/lib/engagement/daily-challenge";
import { logRouteError } from "@/lib/ops/logger";

/**
 * GET /api/daily-challenges — get today's challenges
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = getTodayDateString();
    const challenges = generateDailyChallenges(today);

    return NextResponse.json({
      date: today,
      challenges: challenges.map((c) => ({
        id: c.id,
        difficulty: c.difficulty,
        label: c.label,
        description: c.description,
        icon: c.icon,
        target: getTargetForCondition(c.condition),
        reward: c.reward,
      })),
      perfect_day_bonus: getPerfectDayBonus(),
    });
  } catch (e) {
    logRouteError("GET /api/daily-challenges", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/daily-challenges — report challenge progress
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const challengeId = typeof body?.challenge_id === "string" ? body.challenge_id : "";
    const increment = typeof body?.increment === "number" ? Math.max(0, body.increment) : 1;

    if (!challengeId) {
      return NextResponse.json({ error: "challenge_id required" }, { status: 400 });
    }

    // Validate the challenge exists for today
    const today = getTodayDateString();
    const challenges = generateDailyChallenges(today);
    const challenge = challenges.find((c) => c.id === challengeId);

    if (!challenge) {
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
    }

    // Progress is tracked client-side (localStorage) for simplicity.
    // This endpoint validates and returns the challenge details.
    return NextResponse.json({
      ok: true,
      challenge_id: challengeId,
      target: getTargetForCondition(challenge.condition),
      increment,
      reward: challenge.reward,
    });
  } catch (e) {
    logRouteError("POST /api/daily-challenges", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
