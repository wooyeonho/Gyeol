"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CreatureActivity = "awake" | "drowsy" | "sleeping";

export type CreatureState = {
  /** Current activity level */
  activity: CreatureActivity;
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

export function useCreatureState(vitality: number, isStreaming: boolean) {
  const [state, setState] = useState<CreatureState>({
    activity: "awake",
    breathPhase: 0,
    breathRate: getBreathRate(vitality, "awake"),
    isTyping: false,
    excitePulse: 0,
    idleSeconds: 0,
    pointerNorm: { x: 0, y: 0 },
  });

  const lastInteractionRef = useRef(0);
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef(0);
  const breathAccumRef = useRef(0);
  const exciteRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize lastInteraction on mount (avoids calling Date.now() during render)
  useEffect(() => {
    if (lastInteractionRef.current === 0) {
      lastInteractionRef.current = Date.now();
    }
  }, []);

  // Mark interaction
  const touch = useCallback(() => {
    lastInteractionRef.current = Date.now();
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

  // Pointer tracking
  const updatePointer = useCallback((clientX: number, clientY: number) => {
    if (typeof window === "undefined") return;
    const nx = ((clientX / window.innerWidth) * 2 - 1) * 0.8;
    const ny = ((clientY / window.innerHeight) * 2 - 1) * 0.8;
    setState((s) => {
      if (Math.abs(s.pointerNorm.x - nx) < 0.01 && Math.abs(s.pointerNorm.y - ny) < 0.01) return s;
      return { ...s, pointerNorm: { x: nx, y: ny } };
    });
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

  // Animation loop
  useEffect(() => {
    const tick = (time: number) => {
      if (prevTimeRef.current === 0) prevTimeRef.current = time;
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.1); // cap at 100ms
      prevTimeRef.current = time;

      const idleMs = Date.now() - lastInteractionRef.current;
      const idleSec = idleMs / 1000;

      let activity: CreatureActivity = "awake";
      if (idleSec > SLEEP_AFTER_S) activity = "sleeping";
      else if (idleSec > DROWSY_AFTER_S) activity = "drowsy";

      const rate = getBreathRate(vitality, activity);
      breathAccumRef.current += dt * rate;
      const breathPhase = breathAccumRef.current % 1;

      // Decay excite pulse
      if (exciteRef.current > 0) {
        exciteRef.current = Math.max(0, exciteRef.current - dt * 2.5);
      }

      setState((s) => ({
        ...s,
        activity,
        breathPhase,
        breathRate: rate,
        idleSeconds: Math.floor(idleSec),
        excitePulse: exciteRef.current,
      }));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [vitality]);

  return { state, touch, markTyping, excite, updatePointer };
}
