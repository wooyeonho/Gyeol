"use client";

import { useWorldStore } from "@/store/world-store";

export default function WorldWeather() {
  const worldState = useWorldStore((s) => s.worldState);
  const name = worldState?.weather?.name ?? "Unknown";

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <span className="bg-white/5 rounded-full px-3 py-1 text-xs text-white/80">
        Today: {name}
      </span>
    </div>
  );
}
