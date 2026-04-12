"use client";

import { useEffect, useRef, useState } from "react";
import { joinPresenceChannel, type PresenceState, type PresenceUser } from "@/lib/realtime/presence";
import { subscribeToReactions, type ReactionsMap } from "@/lib/realtime/reactions";

interface UseRealtimeFeedOptions {
  /** Channel name for presence tracking */
  channelName: string;
  /** Current user info for presence */
  currentUser: PresenceUser;
  /** Post IDs to subscribe reactions for */
  postIds?: string[];
  /** Current user ID for reaction state */
  userId?: string;
}

interface RealtimeFeedState {
  /** Users currently viewing this feed */
  presence: PresenceState;
  /** Reactions per post ID */
  reactions: Record<string, ReactionsMap>;
}

/**
 * Hook that combines presence tracking + realtime reactions for a social feed.
 * Uses existing lib/realtime/presence.ts and lib/realtime/reactions.ts.
 *
 * @example
 * const { presence, reactions } = useRealtimeFeed({
 *   channelName: "social-feed",
 *   currentUser: { userId, displayName },
 *   postIds: posts.map(p => p.id),
 *   userId,
 * });
 */
export function useRealtimeFeed({
  channelName,
  currentUser,
  postIds = [],
  userId,
}: UseRealtimeFeedOptions): RealtimeFeedState {
  const [presence, setPresence] = useState<PresenceState>({ onlineUsers: [], count: 0 });
  const [reactions, setReactions] = useState<Record<string, ReactionsMap>>({});
  const cleanupRef = useRef<Array<() => void>>([]);

  // Presence tracking
  useEffect(() => {
    if (!currentUser.userId) return;

    const unsub = joinPresenceChannel(channelName, currentUser, setPresence);
    return () => unsub();
  }, [channelName, currentUser.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reactions subscriptions — only subscribe to visible posts (max 20)
  useEffect(() => {
    if (!userId || postIds.length === 0) return;

    // Cleanup previous subscriptions
    for (const cleanup of cleanupRef.current) {
      cleanup();
    }
    cleanupRef.current = [];

    const visibleIds = postIds.slice(0, 20);

    for (const postId of visibleIds) {
      const unsub = subscribeToReactions(postId, "social_post", userId, (reactionsMap) => {
        setReactions((prev) => ({ ...prev, [postId]: reactionsMap }));
      });
      cleanupRef.current.push(unsub);
    }

    return () => {
      for (const cleanup of cleanupRef.current) {
        cleanup();
      }
      cleanupRef.current = [];
    };
  }, [userId, postIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { presence, reactions };
}
