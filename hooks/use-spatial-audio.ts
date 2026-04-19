"use client";

import { useRef, useCallback } from "react";
import { initSpatialAudio, playSpatialCreatureSound } from "@/lib/soundscape/spatial-audio";

/**
 * React hook for spatially positioned creature sounds.
 *
 * AudioContext is initialized lazily on the first init() call (user gesture
 * required by browser policy). After that, playSound() places audio at the
 * creature's 3D position using Web Audio PannerNode / HRTF.
 */
export function useSpatialAudio() {
  const isReadyRef = useRef(false);

  const init = useCallback(() => {
    const ctx = initSpatialAudio();
    isReadyRef.current = ctx !== null;
  }, []);

  const playSound = useCallback((
    emotion: string,
    position: { x: number; y: number },
    dna?: Record<string, number>,
  ) => {
    if (!isReadyRef.current) return;
    playSpatialCreatureSound(position, emotion, dna);
  }, []);

  return { init, playSound };
}
