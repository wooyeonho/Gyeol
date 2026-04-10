import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ReactionEmoji = "👍" | "❤️" | "😂" | "😮" | "😢" | "🔥";

export interface Reaction {
  emoji: ReactionEmoji;
  count: number;
  userReacted: boolean;
}

export type ReactionsMap = Record<ReactionEmoji, Reaction>;

export const REACTION_EMOJIS: ReactionEmoji[] = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export function emptyReactionsMap(): ReactionsMap {
  return Object.fromEntries(
    REACTION_EMOJIS.map((emoji) => [emoji, { emoji, count: 0, userReacted: false }])
  ) as ReactionsMap;
}

/**
 * Toggle a reaction on a target (message or social post).
 *
 * Upserts or deletes from `reactions` table.
 * Returns the updated counts (optimistic update friendly).
 */
export async function toggleReaction(
  targetId: string,
  targetType: "message" | "social_post",
  emoji: ReactionEmoji,
  userId: string
): Promise<{ added: boolean }> {
  const supabase = createClient();

  // Check if reaction exists
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("target_id", targetId)
    .eq("target_type", targetType)
    .eq("emoji", emoji)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return { added: false };
  } else {
    await supabase.from("reactions").insert({
      target_id: targetId,
      target_type: targetType,
      emoji,
      user_id: userId,
    });
    return { added: true };
  }
}

/**
 * Fetch current reactions for a target.
 */
export async function fetchReactions(
  targetId: string,
  targetType: "message" | "social_post",
  userId: string
): Promise<ReactionsMap> {
  const supabase = createClient();

  const { data } = await supabase
    .from("reactions")
    .select("emoji, user_id")
    .eq("target_id", targetId)
    .eq("target_type", targetType);

  const map = emptyReactionsMap();
  for (const row of data ?? []) {
    const emoji = row.emoji as ReactionEmoji;
    if (map[emoji]) {
      map[emoji].count++;
      if (row.user_id === userId) map[emoji].userReacted = true;
    }
  }
  return map;
}

/**
 * Subscribe to realtime reaction changes for a target.
 * Returns an unsubscribe function.
 */
export function subscribeToReactions(
  targetId: string,
  targetType: "message" | "social_post",
  userId: string,
  onUpdate: (reactions: ReactionsMap) => void
): () => void {
  const supabase = createClient();

  // Initial fetch
  fetchReactions(targetId, targetType, userId).then(onUpdate);

  const channel: RealtimeChannel = supabase
    .channel(`reactions:${targetType}:${targetId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reactions",
        filter: `target_id=eq.${targetId}`,
      },
      () => {
        // Re-fetch on any change
        fetchReactions(targetId, targetType, userId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
