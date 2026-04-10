import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  joinedAt: number;
}

export interface PresenceState {
  /** Users currently online in this channel */
  onlineUsers: PresenceUser[];
  /** Total count (useful when you don't want to show individual names) */
  count: number;
}

/**
 * Join a presence channel and track online users in real-time.
 *
 * Uses Supabase Realtime Presence under the hood.
 *
 * @param channelName  e.g. "social-feed", "user:abc123"
 * @param currentUser  Info about the current user to broadcast
 * @param onChange     Called whenever the presence state updates
 * @returns            Unsubscribe function — call in useEffect cleanup
 *
 * @example
 *   useEffect(() => {
 *     return joinPresenceChannel("social-feed", { userId, displayName }, setState);
 *   }, [userId]);
 */
export function joinPresenceChannel(
  channelName: string,
  currentUser: PresenceUser,
  onChange: (state: PresenceState) => void
): () => void {
  const supabase = createClient();

  const channel: RealtimeChannel = supabase.channel(`presence:${channelName}`, {
    config: { presence: { key: currentUser.userId } },
  });

  function syncState() {
    const presenceState = channel.presenceState<PresenceUser>();
    const onlineUsers = Object.values(presenceState)
      .flat()
      .sort((a, b) => a.joinedAt - b.joinedAt);

    onChange({ onlineUsers, count: onlineUsers.length });
  }

  channel
    .on("presence", { event: "sync" }, syncState)
    .on("presence", { event: "join" }, syncState)
    .on("presence", { event: "leave" }, syncState)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ ...currentUser, joinedAt: Date.now() });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Read-only observer — tracks presence without broadcasting own status.
 * Useful for showing "N people are viewing this" without adding to the count.
 */
export function observePresenceChannel(
  channelName: string,
  onChange: (state: PresenceState) => void
): () => void {
  const supabase = createClient();

  const channel: RealtimeChannel = supabase.channel(`presence:${channelName}`);

  function syncState() {
    const presenceState = channel.presenceState<PresenceUser>();
    const onlineUsers = Object.values(presenceState).flat();
    onChange({ onlineUsers, count: onlineUsers.length });
  }

  channel
    .on("presence", { event: "sync" }, syncState)
    .on("presence", { event: "join" }, syncState)
    .on("presence", { event: "leave" }, syncState)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
