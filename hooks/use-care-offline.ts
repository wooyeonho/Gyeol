"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getLocalCareState,
  setLocalCareState,
  queueCareAction,
  getPendingCareActions,
  clearCareQueue,
  computeLocalDecay,
  applyLocalPet,
  type CareState,
  type DecayDNA,
} from "@/lib/creature/offline-care";
import { createDefaultCareState } from "@/lib/creature/care-loop";

const DECAY_INTERVAL_MS = 60_000; // tick every minute

/**
 * Offline-first care state management.
 *
 * - On mount: loads state from IndexedDB; falls back to serverCareState.
 * - Every minute: applies DNA-aware decay locally and saves to IndexedDB.
 * - While offline: queues feed/rest actions and applies them optimistically.
 * - On reconnect: flushes queue to /api/care and merges server response.
 */
export function useCareOffline(
  agentId: string,
  serverCareState: CareState | null,
  dna?: DecayDNA,
) {
  const [careState, setCareState] = useState<CareState>(
    serverCareState ?? createDefaultCareState(),
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);

  const agentIdRef = useRef(agentId);
  const dnaRef = useRef(dna);
  const careStateRef = useRef(careState);

  agentIdRef.current = agentId;
  dnaRef.current = dna;
  careStateRef.current = careState;

  // Load from IndexedDB on mount; prefer local state over server if fresher
  useEffect(() => {
    getLocalCareState(agentId).then((local) => {
      if (!local) {
        if (serverCareState) {
          setCareState(serverCareState);
          setLocalCareState(agentId, serverCareState).catch(() => {});
        }
        return;
      }
      // Use whichever was updated more recently
      const localTime = new Date(local.lastUpdatedAt).getTime();
      const serverTime = serverCareState
        ? new Date(serverCareState.lastUpdatedAt).getTime()
        : 0;
      const base = localTime >= serverTime ? local : (serverCareState ?? local);
      const decayed = computeLocalDecay(base, dnaRef.current);
      setCareState(decayed);
      setLocalCareState(agentId, decayed).catch(() => {});
    });

    getPendingCareActions(agentId).then((q) => setPendingCount(q.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Periodic decay tick
  useEffect(() => {
    const id = setInterval(() => {
      const decayed = computeLocalDecay(careStateRef.current, dnaRef.current);
      setCareState(decayed);
      setLocalCareState(agentIdRef.current, decayed).catch(() => {});
    }, DECAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /** Flush queued actions to the server and merge the resulting state. */
  const syncToServer = useCallback(async () => {
    const queue = await getPendingCareActions(agentIdRef.current);
    if (queue.length === 0) return;

    for (const entry of queue) {
      try {
        const res = await fetch("/api/care", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agentIdRef.current, action: entry.action }),
        });
        if (res.ok) {
          const json = await res.json() as { careState: CareState };
          if (json.careState) {
            setCareState(json.careState);
            setLocalCareState(agentIdRef.current, json.careState).catch(() => {});
          }
        }
      } catch {/* network error — leave in queue */}
    }

    await clearCareQueue(agentIdRef.current);
    setPendingCount(0);
  }, []);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (isOnline) {
      syncToServer();
    }
  }, [isOnline, syncToServer]);

  const feedLocal = useCallback(async () => {
    if (isOnline) return; // let server handle it when online
    const HUNGER_RESTORE = 30;
    const HAPPINESS_BOOST = 8;
    const next: CareState = {
      ...careStateRef.current,
      hunger: Math.min(100, careStateRef.current.hunger + HUNGER_RESTORE),
      happiness: Math.min(100, careStateRef.current.happiness + HAPPINESS_BOOST),
      lastUpdatedAt: new Date().toISOString(),
      sickSince: null,
    };
    setCareState(next);
    await setLocalCareState(agentIdRef.current, next);
    await queueCareAction(agentIdRef.current, "feed");
    setPendingCount((c: number) => c + 1);
  }, [isOnline]);

  const restLocal = useCallback(async () => {
    if (isOnline) return;
    const ENERGY_RESTORE = 25;
    const next: CareState = {
      ...careStateRef.current,
      energy: Math.min(100, careStateRef.current.energy + ENERGY_RESTORE),
      lastUpdatedAt: new Date().toISOString(),
      sickSince: careStateRef.current.hunger > 0 && Math.min(100, careStateRef.current.energy + ENERGY_RESTORE) > 0 && careStateRef.current.happiness > 0 ? null : careStateRef.current.sickSince,
    };
    setCareState(next);
    await setLocalCareState(agentIdRef.current, next);
    await queueCareAction(agentIdRef.current, "rest");
    setPendingCount((c: number) => c + 1);
  }, [isOnline]);

  const petLocal = useCallback(async (affinityDelta: number) => {
    const next = applyLocalPet(careStateRef.current, affinityDelta);
    setCareState(next);
    await setLocalCareState(agentIdRef.current, next);
  }, []);

  return { careState, isOnline, pendingCount, feedLocal, restLocal, petLocal, syncToServer };
}
