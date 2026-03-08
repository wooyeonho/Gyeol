"use client";

import { useWorldStore } from "@/store/world-store";

export function WorldWeather() {
  const { worldState } = useWorldStore();
  const name = worldState?.weather?.name;

  if (!name) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white/5 rounded-full px-3 py-1 text-xs text-white/60">
        {name}
      </div>
    </div>
  );
}
