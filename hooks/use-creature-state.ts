"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveIdleBehavior, type IdleBehavior } from "@/lib/creature/idle-behaviors";
import { deriveAffinityMood } from "@/lib/creature/affinity-tracker";
import type { CreatureDNA } from "@/lib/genome/dna";

export type CreatureActivity = "awake" | "drowsy" | "sleeping";

/** Extended idle behavior for rich creature states */
export type IdleActivity =
  | "alert" | "curious" | "daydreaming" | "playing"
  | "restless" | "meditating" | "nesting" | "drowsy"
  | "sleeping" | "dreaming";

export type CreatureState = {
  /** Current activity level */
  activity: CreatureActivity;
  /** Rich idle behavior — more granular than activity */
  idleActivity: IdleActivity;
  /** Breathing phase 0..1 (for organic breathing animation) */
  breathPhase: number;
  /** Breathing rate in cycles per second — varies with vitality & activity */
  breathRate: number;
  /** Whether user is currently typing */
  isTyping: boolean;
  /** Flash pulse 0..1 — spikes on message send, decays to 0 */
  excitePulse: number;
  /** Seconds since last user interaction */
  idleSeconds: number;
  /** Normalized pointer position {x,y} in [-1,1] range relative to viewport center */
  pointerNorm: { x: number; y: number };
  /** Micro-tremor offset for organic jitter — tiny random displacement */
  microTremor: { x: number; y: number };
  /** Touch interaction count this session */
  touchCount: number;
  /** Cumulative affinity delta from touches this session */
  sessionAffinity: number;
  /** Affinity-derived mood (from touch/watch/ignore patterns) */
  affinityMood: string;
};

const DROWSY_AFTER_S = 30;
const SLEEP_AFTER_S = 120;

function getBreathRate(vitality: number, activity: CreatureActivity): number {
  const base = 0.18 + vitality * 0.12; // 0.18–0.30 Hz
  switch (activity) {
    case "sleeping":
      return base * 0.4;
    case "drowsy":
      return base * 0.65;
    default:
      return base;
  }
}

export function useCreatureState(
  vitality: number,
  isStreaming: boolean,
  mood?: string | null,
  dna?: CreatureDNA | null,
) {
  const [state, setState] = useState<CreatureState>({
    activity: "awake",
    idleActivity: "alert",
    breathPhase: 0,
    breathRate: getBreathRate(vitality, "awake"),
    isTyping: false,
    excitePulse: 0,
    idleSeconds: 0,
    pointerNorm: { x: 0, y: 0 },
    microTremor: { x: 0, y: 0 },
    touchCount: 0,
    sessionAffinity: 0,
    affinityMood: "neutral",
  });

  // Store DNA/mood/isStreaming in refs for access inside animation loop without re-subscribing
  const moodRef = useRef(mood);
  const dnaRef = useRef(dna);
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { dnaRef.current = dna; }, [dna]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  const lastInteractionRef = useRef(0);
  const sessionStartRef = useRef(0);
  const accumulatedWatchRef = useRef(0);
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef(0);
  const breathAccumRef = useRef(0);
  const exciteRef = useRef(0);
  const tremorRef = useRef({ x: 0, y: 0 });
  const tremorTargetRef = useRef({ x: 0, y: 0 });
  const tremorTimerRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSetStateRef = useRef(0);
  const SET_STATE_INTERVAL = 66; // ~15fps — throttle React re-renders

  // Initialize lastInteraction + sessionStart on mount (avoids calling Date.now() during render)
  useEffect(() => {
    const now = Date.now();
    if (lastInteractionRef.current === 0) {
      lastInteractionRef.current = now;
    }
    if (sessionStartRef.current === 0) {
      sessionStartRef.current = now;
    }
  }, []);

  const touchCountRef = useRef(0);
  const sessionAffinityRef = useRef(0);

  // Mark interaction
  const touch = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Record a creature touch with affinity delta
  const recordCreatureTouch = useCallback((affinityDelta: number) => {
    lastInteractionRef.current = Date.now();
    touchCountRef.current += 1;
    sessionAffinityRef.current += affinityDelta;
  }, []);

  // Typing state
  const markTyping = useCallback(() => {
    touch();
    setState((s) => (s.isTyping ? s : { ...s, isTyping: true }));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setState((s) => (s.isTyping ? { ...s, isTyping: false } : s));
    }, 1500);
  }, [touch]);

  // Excite pulse on message send
  const excite = useCallback(() => {
    exciteRef.current = 1;
    touch();
  }, [touch]);

  // Pointer tracking — stored in ref, synced to state on next throttled tick
  const pointerNormRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const updatePointer = useCallback((clientX: number, clientY: number) => {
    if (typeof window === "undefined") return;
    const nx = ((clientX / window.innerWidth) * 2 - 1) * 0.8;
    const ny = ((clientY / window.innerHeight) * 2 - 1) * 0.8;
    pointerNormRef.current = { x: nx, y: ny };
  }, []);

  // Global event listeners
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      touch();
      updatePointer(e.clientX, e.clientY);
    };
    const onKeyDown = () => touch();
    const onTouchStart = (e: TouchEvent) => {
      touch();
      if (e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, [touch, updatePointer]);

  // Streaming counts as interaction
  useEffect(() => {
    if (isStreaming) touch();
  }, [isStreaming, touch]);

  // Animation loop — runs at 60fps internally, but throttles React setState to ~15fps
  useEffect(() => {
    const tick = (time: number) => {
      if (prevTimeRef.current === 0) prevTimeRef.current = time;
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.1); // cap at 100ms
      prevTimeRef.current = time;

      // Guard: if lastInteraction hasn't been initialized yet, treat idle as 0
      const lastInt = lastInteractionRef.current || Date.now();
      const idleMs = Date.now() - lastInt;
      const idleSec = idleMs / 1000;

      let activity: CreatureActivity = "awake";
      if (idleSec > SLEEP_AFTER_S) activity = "sleeping";
      else if (idleSec > DROWSY_AFTER_S) activity = "drowsy";

      const rate = getBreathRate(vitality, activity);
      breathAccumRef.current += dt * rate;

      // Decay excite pulse
      if (exciteRef.current > 0) {
        exciteRef.current = Math.max(0, exciteRef.current - dt * 2.5);
      }

      // Micro-tremor — tiny organic jitter that makes the creature feel alive
      tremorTimerRef.current -= dt;
      if (tremorTimerRef.current <= 0) {
        const intensity = activity === "sleeping" ? 0.002 : activity === "drowsy" ? 0.005 : 0.008;
        tremorTargetRef.current = {
          x: (Math.random() - 0.5) * 2 * intensity,
          y: (Math.random() - 0.5) * 2 * intensity,
        };
        tremorTimerRef.current = 0.15 + Math.random() * 0.35; // retarget every 150-500ms
      }
      // Smooth lerp toward target
      tremorRef.current = {
        x: tremorRef.current.x + (tremorTargetRef.current.x - tremorRef.current.x) * 0.12,
        y: tremorRef.current.y + (tremorTargetRef.current.y - tremorRef.current.y) * 0.12,
      };

      // Throttle setState to ~15fps to avoid re-rendering the entire tree every frame.
      // Exception: activity changes are always flushed immediately.
      const now = time;
      const elapsed = now - lastSetStateRef.current;
      const activityChanged = (prev: CreatureState) => prev.activity !== activity;

      if (elapsed >= SET_STATE_INTERVAL) {
        lastSetStateRef.current = now;
        // Accumulate watch time: user is "watching" when idle < 30s (page active, engaged)
        if (idleSec < 30) {
          accumulatedWatchRef.current += (SET_STATE_INTERVAL / 1000);
        }

        // Derive affinity mood from session interaction patterns
        const affinityMoodValue = deriveAffinityMood({
          watchSeconds: accumulatedWatchRef.current,
          touchCount: touchCountRef.current,
          touchAffinity: sessionAffinityRef.current,
          ignoreSeconds: idleSec > 60 ? idleSec - 60 : 0,
          lastInteractionAt: lastInteractionRef.current,
          sessionStartAt: sessionStartRef.current,
        });

        // Full idle behavior resolution — BG3-style: DNA + mood + affinity drive behavior
        const resolvedIdle: IdleBehavior = resolveIdleBehavior({
          idleSeconds: Math.floor(idleSec),
          mood: moodRef.current ?? null,
          dna: dnaRef.current ?? null,
          affinityMood: affinityMoodValue,
          recentTouchCount: touchCountRef.current,
          isStreaming: isStreamingRef.current,
        });

        // Map rich idle to basic activity for backward compat
        const idleActivity: IdleActivity = resolvedIdle;

        setState((s) => ({
          ...s,
          activity,
          idleActivity,
          breathPhase: breathAccumRef.current % 1,
          breathRate: rate,
          idleSeconds: Math.floor(idleSec),
          excitePulse: exciteRef.current,
          pointerNorm: pointerNormRef.current,
          microTremor: { ...tremorRef.current },
          touchCount: touchCountRef.current,
          sessionAffinity: sessionAffinityRef.current,
          affinityMood: affinityMoodValue,
        }));
      } else {
        // Still flush if activity changed (low frequency, important for UI)
        setState((s) => {
          if (!activityChanged(s)) return s; // no-op, no re-render
          return { ...s, activity };
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [vitality]);

  return { state, touch, markTyping, excite, updatePointer, recordCreatureTouch };
}
