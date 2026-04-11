"use client";

import { useEffect, useState, useCallback } from "react";

export interface EngagementState {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  shieldCount: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
}

const DEFAULT_STATE: EngagementState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  shieldCount: 0,
  totalXp: 0,
  level: 1,
  xpIntoLevel: 0,
  xpForNext: 100,
};

/**
 * Client-side hook for reading the user's current streak / XP / level state.
 * Polls on demand via `refresh()`.
 */
export function useEngagementState(): {
  state: EngagementState;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<EngagementState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/engagement/state", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as Partial<EngagementState>;
      setState((prev) => ({ ...prev, ...json }));
    } catch {
      // swallow — engagement is non-critical UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, loading, refresh };
}
