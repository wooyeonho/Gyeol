"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getPvPState,
  getWinRate,
  getRankInfo,
  PVP_RANKS,
  type PvPState,
  type PvPRank,
} from "@/lib/game/pvp-ranking";

interface PvPRankCardProps {
  locale?: string;
  compact?: boolean;
}

export function PvPRankCard({ locale = "ko", compact = false }: PvPRankCardProps) {
  const [state] = useState<PvPState>(getPvPState);
  const isKo = locale === "ko";
  const rankInfo = useMemo(() => getRankInfo(state.rank), [state.rank]);
  const winRate = useMemo(() => getWinRate(state), [state]);

  // Progress to next rank
  const currentRankMin = PVP_RANKS[state.rank].minRating;
  const ranks = Object.keys(PVP_RANKS) as PvPRank[];
  const currentIdx = ranks.indexOf(state.rank);
  const nextRank = currentIdx < ranks.length - 1 ? ranks[currentIdx + 1] : null;
  const nextRankMin = nextRank ? PVP_RANKS[nextRank].minRating : state.rating;
  const progressToNext = nextRank
    ? Math.min(100, ((state.rating - currentRankMin) / (nextRankMin - currentRankMin)) * 100)
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{rankInfo.icon}</span>
        <div>
          <p className="text-xs font-medium" style={{ color: rankInfo.color }}>
            {isKo ? rankInfo.label.ko : rankInfo.label.en}
          </p>
          <p className="text-[10px] text-white/40">{state.rating} RP</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      {/* Rank header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${rankInfo.color}15`, borderColor: `${rankInfo.color}30` }}
          >
            {rankInfo.icon}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: rankInfo.color }}>
              {isKo ? rankInfo.label.ko : rankInfo.label.en}
            </p>
            <p className="text-xs text-white/50">{state.rating} RP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">{winRate}%</p>
          <p className="text-[10px] text-white/40">{isKo ? "승률" : "Win Rate"}</p>
        </div>
      </div>

      {/* Progress bar to next rank */}
      {nextRank && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>{isKo ? rankInfo.label.ko : rankInfo.label.en}</span>
            <span>{isKo ? PVP_RANKS[nextRank].label.ko : PVP_RANKS[nextRank].label.en}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: rankInfo.color }}
              initial={{ width: "0%" }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: isKo ? "승" : "W", value: state.wins, color: "#4ade80" },
          { label: isKo ? "패" : "L", value: state.losses, color: "#f87171" },
          { label: isKo ? "무" : "D", value: state.draws, color: "#94a3b8" },
          { label: isKo ? "연승" : "Streak", value: state.streak, color: "#fbbf24" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/[0.03] py-1.5 text-center">
            <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[9px] text-white/30">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent matches */}
      {state.matchHistory.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-white/30 mb-1.5">
            {isKo ? "최근 전적" : "Recent Matches"}
          </p>
          <div className="flex gap-1">
            {state.matchHistory.slice(0, 10).map((match) => (
              <div
                key={match.id}
                className={`h-5 w-5 rounded-md flex items-center justify-center text-[8px] font-bold ${
                  match.result === "win"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : match.result === "loss"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                }`}
                title={`${match.opponentName} (${match.ratingChange > 0 ? "+" : ""}${match.ratingChange})`}
              >
                {match.result === "win" ? "W" : match.result === "loss" ? "L" : "D"}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
