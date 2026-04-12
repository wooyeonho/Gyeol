"use client";

import { useEffect, useState, useCallback } from "react";

interface PendingAction {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
}

const STORAGE_KEY = "gyeol_offline_queue";

function readQueue(): PendingAction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Hook for offline-first optimistic mutations.
 * Queues actions when offline and flushes when connectivity returns.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingCount(readQueue().length);

    function handleOnline() {
      setIsOnline(true);
      flushQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback((type: string, payload: unknown) => {
    const action: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      createdAt: Date.now(),
    };
    const queue = [...readQueue(), action];
    writeQueue(queue);
    setPendingCount(queue.length);
    return action.id;
  }, []);

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0 || !navigator.onLine) return;

    setSyncing(true);
    const failed: PendingAction[] = [];

    for (const action of queue) {
      try {
        await fetch("/api/offline/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: action.type, payload: action.payload }),
        });
      } catch {
        failed.push(action);
      }
    }

    writeQueue(failed);
    setPendingCount(failed.length);
    setSyncing(false);
  }, []);

  return { isOnline, pendingCount, syncing, enqueue, flushQueue };
}
