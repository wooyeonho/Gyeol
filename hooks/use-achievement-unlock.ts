"use client";

import { useCallback, useEffect, useState } from "react";
import type { AchievementDefinition } from "@/lib/engagement/achievements";

type AchievementResponseItem = AchievementDefinition & {
  unlocked: boolean;
  newly_unlocked: boolean;
};

type AchievementsResponse = {
  achievements: AchievementResponseItem[];
};

function stripRuntimeFlags(item: AchievementResponseItem): AchievementDefinition {
  // Destructure the runtime-only flags off — the remaining object matches
  // AchievementDefinition structurally.
  const {
    unlocked: _unlocked,
    newly_unlocked: _newly,
    ...def
  } = item;
  void _unlocked;
  void _newly;
  return def;
}

/**
 * Phase 2-3: Surface newly-unlocked achievements as a celebration queue.
 *
 * Fetches `/api/achievements` on mount and whenever `refresh()` is called.
 * The first newly-unlocked achievement is exposed as `current`; after
 * the user dismisses it, the next queued entry shifts in.
 *
 * `dismiss()` PATCHes the server so the same achievement never shows
 * its unlock animation twice across sessions.
 */
export function useAchievementUnlock() {
  const [queue, setQueue] = useState<AchievementDefinition[]>([]);

  // Fetch on mount. We inline the .then() chain instead of awaiting inside
  // the effect body so React's lint rules see the setState call happen
  // inside a promise continuation (microtask) rather than synchronously.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/achievements", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AchievementsResponse>) : null))
      .then((json) => {
        if (cancelled || !json) return;
        const newly = (json.achievements ?? [])
          .filter((a) => a.newly_unlocked)
          .map(stripRuntimeFlags);
        if (newly.length > 0) {
          setQueue((prev) => [...prev, ...newly]);
        }
      })
      .catch(() => {
        // Non-fatal — the achievements page will still show unlocks on its own.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Manual refresh — callable by any caller that just did something which
  // might have unlocked a new badge (e.g. after a care action).
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/achievements", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AchievementsResponse;
      const newly = (json.achievements ?? [])
        .filter((a) => a.newly_unlocked)
        .map(stripRuntimeFlags);
      if (newly.length > 0) {
        setQueue((prev) => [...prev, ...newly]);
      }
    } catch {
      // Best-effort.
    }
  }, []);

  const current = queue[0] ?? null;

  const dismiss = useCallback(async () => {
    setQueue((prev) => prev.slice(1));
    try {
      await fetch("/api/achievements", { method: "PATCH" });
    } catch {
      // Best-effort.
    }
  }, []);

  return { current, dismiss, refresh };
}
