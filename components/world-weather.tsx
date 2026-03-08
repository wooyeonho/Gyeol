"use client";

import { useWorldStore } from "@/store/world-store";

const WEATHER_ICONS: Record<string, string> = {
  "고요": "◦",
  "폭풍": "⊙",
  "안개": "◌",
  "빛": "✦",
  "어둠": "●",
  "비": "◎",
  "눈": "❄",
};

export function WorldWeather() {
  const { worldState } = useWorldStore();
  const weather = worldState?.weather;
  const name = weather?.name;

  if (!name) return null;

  const icon = WEATHER_ICONS[name] || "◦";

  return (
    <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span className="text-white/25 text-xs">{icon}</span>
        <span className="text-white/35 text-xs font-light tracking-wider">{name}</span>
      </div>
    </div>
  );
}
