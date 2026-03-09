"use client";

import { useWorldStore } from "@/store/world-store";
import { motion, AnimatePresence } from "framer-motion";

const WEATHER_VISUAL: Record<string, { icon: string; gradient: string }> = {
  "맑음": { icon: "☀", gradient: "from-amber-500/20 to-orange-500/10" },
  "흐림": { icon: "☁", gradient: "from-gray-400/20 to-slate-500/10" },
  "비": { icon: "🌧", gradient: "from-blue-500/20 to-cyan-500/10" },
  "폭풍": { icon: "⛈", gradient: "from-violet-500/20 to-purple-500/10" },
  "눈": { icon: "❄", gradient: "from-cyan-200/20 to-blue-200/10" },
  "안개": { icon: "🌫", gradient: "from-gray-300/20 to-gray-400/10" },
  "혼돈": { icon: "🌀", gradient: "from-red-500/20 to-orange-500/10" },
  "고요": { icon: "✨", gradient: "from-indigo-500/20 to-purple-300/10" },
};

export function WorldWeather() {
  const { worldState } = useWorldStore();
  const name = worldState?.weather?.name;

  if (!name) return null;

  const visual = Object.entries(WEATHER_VISUAL).find(([key]) =>
    (name as string).includes(key)
  );
  const icon = visual?.[1]?.icon ?? "🌍";
  const gradient = visual?.[1]?.gradient ?? "from-white/10 to-white/5";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-10"
      >
        <div className={`glass rounded-full px-4 py-1.5 flex items-center gap-2 bg-gradient-to-r ${gradient}`}>
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-medium text-white/70">{name as string}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
