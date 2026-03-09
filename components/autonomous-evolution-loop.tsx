"use client";

import { useEffect } from "react";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

export function AutonomousEvolutionLoop() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const runAutonomousCycle = useRelationshipOsStore((state) => state.runAutonomousCycle);

  useEffect(() => {
    if (!hasHydrated) return;

    const initialTimer = window.setTimeout(() => {
      runAutonomousCycle();
    }, 3000);

    const interval = window.setInterval(() => {
      runAutonomousCycle();
    }, 45000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [hasHydrated, runAutonomousCycle]);

  return null;
}
