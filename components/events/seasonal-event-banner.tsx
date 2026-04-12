"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";

interface SeasonalEventBannerProps {
  event: {
    id: string;
    label: string;
    icon: string;
    themeColor: string;
    endDate: string;
    communityProgress?: { current: number; target: number };
  };
  onTap?: () => void;
  className?: string;
}

function useCountdown(endDate: string) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("종료됨"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(d > 0 ? `${d}일 ${h}시간` : `${h}시간 ${m}분`);
    }
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [endDate]);

  return remaining;
}

export function SeasonalEventBanner({ event, onTap, className = "" }: SeasonalEventBannerProps) {
  const countdown = useCountdown(event.endDate);
  const progress = event.communityProgress;
  const pct = progress ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : null;

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.apple}
      className={`w-full rounded-2xl border border-white/10 p-4 text-left backdrop-blur-sm ${className}`}
      style={{ background: `linear-gradient(135deg, ${event.themeColor}15, ${event.themeColor}05)` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{event.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{event.label}</p>
            <p className="text-[10px] text-white/40">⏰ {countdown} 남음</p>
          </div>
        </div>
        <span className="text-[10px] text-white/30">→</span>
      </div>

      {pct !== null && progress && (
        <div className="mt-3 space-y-1">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: event.themeColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30">
            <span>커뮤니티 목표</span>
            <span>{progress.current.toLocaleString()}/{progress.target.toLocaleString()}</span>
          </div>
        </div>
      )}
    </motion.button>
  );
}
