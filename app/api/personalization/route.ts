import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildBehaviorProfile,
  generatePersonalizationConfig,
} from "@/lib/ai/personalization-engine";

/**
 * GET /api/personalization — Get personalized config for the current user.
 */
export async function GET() {
  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Gather behavior data
  const { count: totalMessages } = await service
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: streakData } = await service
    .from("engagement_streaks")
    .select("current_streak, created_at")
    .eq("user_id", user.id)
    .single();

  const daysSinceJoined = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : 1;

  const profile = buildBehaviorProfile({
    totalMessages: totalMessages ?? 0,
    daysSinceJoined: Math.max(1, daysSinceJoined),
    messagesByHour: new Array(24).fill(0), // Simplified — would aggregate from messages
    recentTopics: [],
    currentStreak: streakData?.current_streak ?? 0,
    avgMessageLength: 80, // Default — would calculate from messages
  });

  const config = generatePersonalizationConfig(profile);

  return NextResponse.json({ profile, config });
}
