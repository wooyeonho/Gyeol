import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FeedEvent = {
  id: unknown;
  agent_id: unknown;
  event_type: unknown;
  payload: unknown;
  created_at: string;
  agent?: { custom_name?: string; species?: string; level?: number } | null;
};

/**
 * GET /api/feed?tab=all|friends|ai
 * Returns a personalized activity feed.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = request.nextUrl.searchParams.get("tab") ?? "all";

  // Fetch recent agent activity events
  const { data: events } = await supabase
    .from("agent_activity_feed")
    .select("id, agent_id, event_type, payload, created_at, agent:agents(custom_name, species, level)")
    .order("created_at", { ascending: false })
    .limit(tab === "friends" ? 30 : 50);

  // For friends tab, filter to only agents the user follows
  let filtered: FeedEvent[] = (events ?? []) as FeedEvent[];
  if (tab === "friends" && user) {
    const { data: following } = await supabase
      .from("social_connections")
      .select("followee_agent_id")
      .eq("follower_agent_id", user.id);
    const followingIds = new Set((following ?? []).map((f: { followee_agent_id: string }) => f.followee_agent_id));
    filtered = filtered.filter((e) => followingIds.has(e.agent_id as string));
  }

  // For AI tab, add a personalized score (based on same species preference)
  if (tab === "ai") {
    const { data: myAgent } = await supabase
      .from("agents")
      .select("species")
      .eq("user_id", user.id)
      .maybeSingle();
    const mySpecies = myAgent?.species;
    // Boost items from same species and sort
    const scored = filtered.map((e) => ({
      event: e,
      score: e.agent?.species === mySpecies ? 2 : 1,
    }));
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime(),
    );
    filtered = scored.slice(0, 30).map((s) => s.event);
  }

  return NextResponse.json({ tab, events: filtered });
}
