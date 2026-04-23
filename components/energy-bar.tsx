"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  getEnergy,
  REGEN_INTERVAL_MS,
  type EnergyState,
} from "@/lib/game/energy-system";

function getEnergyState(): EnergyState { return getEnergy(); }

function getTimeToNextRegen(): { minutes: number; seconds: number } | null {
  const state = getEnergy();
  if (state.current >= state.max) return null;
  const lastRegen = new Date(state.lastRegenAt).getTime();
  const nextRegen = lastRegen + REGEN_INTERVAL_MS;
  const remaining = Math.max(0, nextRegen - Date.now());
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return { minutes, seconds };
}

interface EnergyBarProps {
  compact?: boolean;
  locale?: string;
}

export function EnergyBar({ compact = false, locale = "ko" }: EnergyBarProps) {
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [regenTime, setRegenTime] = useState<{ minutes: number; seconds: number } | null>(null);
  const isKo = locale === "ko";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnergy(getEnergyState());
    setRegenTime(getTimeToNextRegen());

    const interval = setInterval(() => {
      setEnergy(getEnergyState());
      setRegenTime(getTimeToNextRegen());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!energy) return null;

  const pct = (energy.current / energy.max) * 100;
  const isLow = energy.current <= 3;
  const totalAvailable = energy.current + ((energy as EnergyState & { bonusEnergy?: number }).bonusEnergy ?? 0);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm" aria-hidden="true">⚡</span>
        <span className={`text-xs font-medium ${isLow ? "text-red-400" : "text-white/70"}`}>
          {totalAvailable}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden="true">⚡</span>
          <span className="text-xs font-medium text-white/70">
            {isKo ? "에너지" : "Energy"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${isLow ? "text-red-400" : "text-white"}`}>
            {energy.current}/{energy.max}
          </span>
          {((energy as EnergyState & { bonusEnergy?: number }).bonusEnergy ?? 0) > 0 && (
            <span className="text-[10px] text-amber-400/70">
              +{(energy as EnergyState & { bonusEnergy?: number }).bonusEnergy}
            </span>
          )}
        </div>
      </div>

      {/* Energy bar with individual heart slots */}
      <div className="flex gap-0.5">
        {Array.from({ length: energy.max }).map((_, i) => (
          <motion.div
            key={i}
            className={`h-2 flex-1 rounded-sm ${
              i < energy.current
                ? isLow
                  ? "bg-red-400"
                  : "bg-cyan-400"
                : "bg-white/10"
            }`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.02 }}
          />
        ))}
      </div>

      {/* Regen timer */}
      {regenTime && (
        <p className="mt-1.5 text-[10px] text-white/30">
          {isKo
            ? `다음 충전: ${regenTime.minutes}분 ${regenTime.seconds}초`
            : `Next: ${regenTime.minutes}m ${regenTime.seconds}s`
          }
        </p>
      )}
    </div>
  );
}
