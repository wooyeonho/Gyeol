"use client";

/**
 * useCreatureDna — Supabase Realtime subscription for live DNA evolution.
 *
 * ── Data flow ────────────────────────────────────────────────────────────────
 *
 *  Supabase Realtime channel  (postgres_changes, UPDATE, agent_state)
 *    │  filtered by agent_id=eq.{agentId}  ← only this creature's rows
 *    ▼
 *  payload.new.genome.dna  (CreatureDNA)
 *    ▼
 *  useAgentStore.patchDna(dna)
 *    ▼
 *  Zustand agentState.genome.dna updated in-place
 *    ▼
 *  procedural-creature.tsx reads DNA from store → R3F morph targets update
 *  use-dna-glitch.ts detects ≥0.05 axis delta → triggers visual glitch
 *
 * visibilitychange refetch:
 *   When the tab regains focus after being hidden, we do a full fetchAgentState()
 *   to catch any mutations that arrived while the channel was backgrounded.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage — drop into the top-level creature page component:
 *   useCreatureDna(agentId);   // agentId from useAgentStore
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAgentStore } from "@/store/agent-store";
import type { CreatureDNA } from "@/lib/genome/dna";

export function useCreatureDna(agentId: string | null): void {
  const patchDna        = useAgentStore((s: { patchDna: (dna: CreatureDNA) => void }) => s.patchDna);
  const fetchAgentState = useAgentStore((s: { fetchAgentState: (opts?: { silent?: boolean }) => Promise<void> }) => s.fetchAgentState);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!agentId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`creature-dna:${agentId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event:  "UPDATE",
          schema: "public",
          table:  "agent_state",
          // Row-level filter: only receive updates for this agent.
          // Reduces Realtime traffic — other agents' evolutions are irrelevant.
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const genome = payload.new?.genome as { dna?: CreatureDNA } | undefined;
          if (genome?.dna) {
            patchDna(genome.dna);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agentId, patchDna]);

  // ── Visibility refetch ─────────────────────────────────────────────────────
  // Supabase Realtime may miss events while the tab is in the background.
  // Re-fetch full agent state on tab focus to guarantee consistency.
  useEffect(() => {
    if (!agentId) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAgentState({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [agentId, fetchAgentState]);
}
