import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation/schemas";
import { z } from "zod";
import {
  generateDailyChallenges,
  getTodayDateString,
  getTargetForCondition,
  getPerfectDayBonus,
} from "@/lib/engagement/daily-challenge";
import { logRouteError } from "@/lib/ops/logger";

const dailyChallengeProgressSchema = z.object({
  challenge_id: z.string().min(1).max(100),
  increment: z.number().int().min(0).max(100).optional().default(1),
});

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
    if (!verifyCsrfOrigin(req)) {
      return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
    }
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(`daily-challenge:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = await parseBody(req, dailyChallengeProgressSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { challenge_id: challengeId, increment } = parsed.data;

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
