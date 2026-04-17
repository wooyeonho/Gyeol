"use client";

import { useEffect, useRef, useState } from "react";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";

/**
 * Fires a short glitch animation when the creature's DNA undergoes
 * a significant genetic change (threshold 0.05 = evolution-level shift).
 * Small drift from conversation is ignored so the glitch stays rare and impactful.
 */
export function useDnaGlitch(dna: CreatureDNA, threshold = 0.05): boolean {
  const [glitching, setGlitching] = useState(false);
  const prevDnaRef = useRef<CreatureDNA>(dna);

  useEffect(() => {
    const maxChange = DNA_AXES.reduce(
      (max, axis) => Math.max(max, Math.abs(dna[axis] - prevDnaRef.current[axis])),
      0,
    );
    if (maxChange >= threshold) {
      setGlitching(true);
      const t = setTimeout(() => setGlitching(false), 200); // 0.2s — short and intense
      prevDnaRef.current = dna;
      return () => clearTimeout(t);
    }
  }, [dna, threshold]);

  return glitching;
}
