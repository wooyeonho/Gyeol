import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

/**
 * G5: If user has connected Spotify/YouTube, analyze playlists for mood.
 * "This week you only listened to sad songs." / "This song on repeat for 3 days. Why?"
 */
export async function tryAnalyzeMusicMood(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: agent } = await service.from("agents").select("user_id").eq("id", agentId).single();
  const userId = (agent as { user_id?: string })?.user_id;
  if (!userId) return;

  const { data: conn } = await service
    .from("user_connections")
    .select("metadata")
    .eq("user_id", userId)
    .in("service", ["spotify", "youtube"])
    .limit(1)
    .maybeSingle();
  const meta = (conn as { metadata?: { recent_tracks?: string[]; mood_hint?: string } })?.metadata;
  if (!meta?.recent_tracks?.length) return;

  const tracks = meta.recent_tracks.slice(0, 20).join(", ");
  const raw = (await generateJSON(
    "From recent track titles/artists, infer mood in one short sentence. Korean or English.",
    `Tracks: ${tracks}\n\nJSON: {"mood_observation":"one sentence or null"}`,
  )) as { mood_observation?: string } | null;
  if (!raw?.mood_observation) return;

  const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_question: raw.mood_observation.slice(0, 300) },
  }).eq("agent_id", agentId);
}
