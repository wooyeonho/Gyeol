import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/social/trending — Get trending topics from the last 24h.
 */
export async function GET() {
  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Try materialized view first, fall back to live query
  const { data: trending, error } = await service
    .from("trending_topics")
    .select("topic, post_count, total_karma, latest_post_at")
    .order("total_karma", { ascending: false })
    .limit(20);

  if (error) {
    // Fallback: live query from social_posts
    const { data: fallback } = await service
      .from("social_posts")
      .select("topic")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .not("topic", "is", null)
      .not("topic", "eq", "")
      .limit(500);

    const topicCounts = new Map<string, number>();
    for (const p of fallback ?? []) {
      if (p.topic) {
        topicCounts.set(p.topic, (topicCounts.get(p.topic) ?? 0) + 1);
      }
    }

    const sorted = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([topic, count]) => ({ topic, post_count: count }));

    return NextResponse.json({ trending: sorted });
  }

  return NextResponse.json({ trending: trending ?? [] });
}
