"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { chooseControlledAutonomousIntent } from "@/lib/creature-life/autonomy-engine";
import { createCreatureEvent } from "@/lib/creature-life/event-log";
import { createInitialCreatureState } from "@/lib/creature-life/initial-state";
import { creatureReducer } from "@/lib/creature-life/reducer";
import { appendCreatureEvent, loadCreatureState, saveCreatureState } from "@/lib/creature-life/storage";
import type { CreatureEvent, CreatureState } from "@/lib/creature-life/types";
import { toVisibleLifeSignal } from "@/lib/creature-life/visible-signals";

function minutesSince(iso: string, now: Date) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 60_000));
}

export function useCreatureLife(creatureId: string | null) {
  const stableId = creatureId ?? "local";
  const [state, setState] = useState<CreatureState>(() => createInitialCreatureState(stableId));

  const reduceAndPersist = useCallback((event: CreatureEvent) => {
    setState((current) => {
      const next = creatureReducer(current, event);
      appendCreatureEvent(current.id, event);
      saveCreatureState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const now = new Date();
    const loaded = loadCreatureState(stableId);
    const returned = createCreatureEvent("USER_RETURNED", { elapsedMinutes: minutesSince(loaded.lastSeenAt, now) }, now.toISOString());
    const next = creatureReducer(loaded, returned);
    appendCreatureEvent(stableId, returned);
    saveCreatureState(next);
    queueMicrotask(() => setState(next));
  }, [stableId]);

  const visibleSignal = useMemo(() => toVisibleLifeSignal(chooseControlledAutonomousIntent(state)), [state]);

  const recordTouch = useCallback((intensity: "light" | "long" = "light") => {
    reduceAndPersist(createCreatureEvent("TOUCHED", { intensity }));
  }, [reduceAndPersist]);

  const recordMessageSent = useCallback((text: string, tone?: string) => {
    reduceAndPersist(createCreatureEvent("MESSAGE_SENT", { textLength: text.length, tone }));
  }, [reduceAndPersist]);

  return {
    creatureLifeState: state,
    visibleSignal,
    recordCreatureLifeEvent: reduceAndPersist,
    recordMessageSent,
    recordTouch,
  };
}
