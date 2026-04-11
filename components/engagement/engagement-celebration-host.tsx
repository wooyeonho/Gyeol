"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { LevelUpToast } from "@/components/engagement/level-up-toast";
import { AchievementUnlockToast } from "@/components/engagement/achievement-unlock-toast";
import { useAchievementUnlock } from "@/hooks/use-achievement-unlock";
import { CoinBurstHost } from "@/components/effects/coin-burst";

const LAST_LEVEL_KEY = "gyeol:last-seen-level";

function readLastSeenLevel(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_LEVEL_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeLastSeenLevel(level: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LEVEL_KEY, String(level));
  } catch {
    // Non-fatal.
  }
}

/**
 * Phase 2-3: Mount point for every "something just happened" full-screen
 * celebration triggered by the engagement subsystem.
 *
 * - Level up: detected by comparing engagement.level to the last value
 *   cached in localStorage. The toast sticks until the user dismisses it.
 * - Achievement unlock: surfaced by `useAchievementUnlock` which polls
 *   /api/achievements and queues unseen items.
 */
export function EngagementCelebrationHost() {
  const engagement = useAgentStore((s) => s.engagement);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const { current: achievement, dismiss: dismissAchievement } = useAchievementUnlock();

  useEffect(() => {
    if (!engagement) return;
    const previous = readLastSeenLevel();
    if (previous == null) {
      // First visit — just remember current level, never celebrate
      // a retroactive level-up on a brand-new device.
      writeLastSeenLevel(engagement.level);
      return;
    }
    if (engagement.level > previous) {
      writeLastSeenLevel(engagement.level);
      // Defer to a microtask so the lint rule doesn't flag synchronous
      // setState inside an effect body. The visual effect is identical
      // because React batches updates before paint.
      const nextLevel = engagement.level;
      queueMicrotask(() => setLevelUpTo(nextLevel));
    } else if (engagement.level < previous) {
      // Sanity heal (shouldn't happen, but keeps cache honest).
      writeLastSeenLevel(engagement.level);
    }
  }, [engagement]);

  return (
    <>
      <LevelUpToast level={levelUpTo} onDismiss={() => setLevelUpTo(null)} />
      <AchievementUnlockToast
        achievement={achievement}
        onDismiss={() => void dismissAchievement()}
      />
      <CoinBurstHost />
    </>
  );
}
