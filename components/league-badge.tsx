"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getLadderState,
  getLeagueInfo,
  LEAGUE_CONFIG,
  type LadderState,
  type League,
} from "@/lib/game/ladder-system";

// ── Props ────────────────────────────────────────────────────────────────────

interface LeagueBadgeProps {
  /** "compact" = icon + name, "full" = icon + name + points bar */
  mode?: "compact" | "full";
  /** Optional locale override */
  locale?: "ko" | "en";
  /** External ladder state (if not provided, reads from localStorage) */
  state?: LadderState;
}

// ── Helper: points progress within current league ────────────────────────────

const LEAGUES_ORDERED: League[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "legend",
];

function getLeagueProgress(state: LadderState): number {
  const info = LEAGUE_CONFIG[state.league];
  const idx = LEAGUES_ORDERED.indexOf(state.league);
  const nextLeague = idx < LEAGUES_ORDERED.length - 1 ? LEAGUES_ORDERED[idx + 1] : null;
  const max = nextLeague ? LEAGUE_CONFIG[nextLeague].minPoints : info.minPoints + 1000;
  const range = max - info.minPoints;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (state.points - info.minPoints) / range));
}

function getNextLeaguePoints(state: LadderState): number {
  const idx = LEAGUES_ORDERED.indexOf(state.league);
  const nextLeague = idx < LEAGUES_ORDERED.length - 1 ? LEAGUES_ORDERED[idx + 1] : null;
  return nextLeague ? LEAGUE_CONFIG[nextLeague].minPoints : state.points;
}

// ── Promotion/Demotion animation overlay ─────────────────────────────────────

function TransitionOverlay({
  type,
  league,
  locale,
}: {
  type: "promoted" | "demoted";
  league: League;
  locale: "ko" | "en";
}) {
  const info = getLeagueInfo(league);
  const isPromotion = type === "promoted";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
    >
      <div
        className={`
          rounded-2xl px-6 py-3 text-center shadow-2xl
          ${isPromotion ? "bg-green-600/90" : "bg-red-600/90"}
        `}
      >
        <motion.div
          animate={{ rotate: isPromotion ? [0, -10, 10, -5, 5, 0] : [0, 5, -5, 0] }}
          transition={{ duration: 0.6 }}
          className="text-3xl"
        >
          {isPromotion ? "🎉" : "😔"}
        </motion.div>
        <div className="mt-1 text-xs font-bold text-white">
          {isPromotion
            ? locale === "ko"
              ? "승급!"
              : "Promoted!"
            : locale === "ko"
              ? "강등"
              : "Demoted"}
        </div>
        <div className="text-sm font-bold text-white">
          {info.icon} {info.label[locale]}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LeagueBadge({
  mode = "compact",
  locale = "ko",
  state: externalState,
}: LeagueBadgeProps) {
  const [ladderState, setLadderState] = useState<LadderState | null>(null);
  const [transition, setTransition] = useState<{
    type: "promoted" | "demoted";
    league: League;
  } | null>(null);
  const [prevLeague, setPrevLeague] = useState<League | null>(null);

  useEffect(() => {
    const state = externalState ?? getLadderState();
    setLadderState(state);
    setPrevLeague(state.league);
  }, [externalState]);

  // Detect league changes for animation
  useEffect(() => {
    if (!ladderState || !prevLeague) return;
    if (ladderState.league === prevLeague) return;

    const prevIdx = LEAGUES_ORDERED.indexOf(prevLeague);
    const currIdx = LEAGUES_ORDERED.indexOf(ladderState.league);

    if (currIdx > prevIdx) {
      setTransition({ type: "promoted", league: ladderState.league });
    } else if (currIdx < prevIdx) {
      setTransition({ type: "demoted", league: ladderState.league });
    }

    setPrevLeague(ladderState.league);

    const timeout = setTimeout(() => setTransition(null), 2500);
    return () => clearTimeout(timeout);
  }, [ladderState?.league, prevLeague]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ladderState) {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-800" />;
  }

  const info = getLeagueInfo(ladderState.league);
  const progress = getLeagueProgress(ladderState);
  const nextPoints = getNextLeaguePoints(ladderState);

  // ── Compact mode ───────────────────────────────────────────────────────
  if (mode === "compact") {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex items-center gap-1 rounded-lg px-2 py-1"
          style={{ backgroundColor: `${info.color}20` }}
        >
          <span className="text-base">{info.icon}</span>
          <span
            className="text-xs font-bold"
            style={{ color: info.color }}
          >
            {info.label[locale]}
          </span>
        </motion.div>

        {/* Transition overlay */}
        <AnimatePresence>
          {transition && (
            <TransitionOverlay
              type={transition.type}
              league={transition.league}
              locale={locale}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Full mode ──────────────────────────────────────────────────────────
  return (
    <div className="relative w-full max-w-xs">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-800 bg-gray-950 p-3"
      >
        {/* League header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-2xl"
            >
              {info.icon}
            </motion.span>
            <div>
              <div className="text-sm font-bold" style={{ color: info.color }}>
                {info.label[locale]}
              </div>
              <div className="text-[10px] text-gray-500">
                Rank #{ladderState.rank}
              </div>
            </div>
          </div>

          {/* Zone indicator */}
          {ladderState.promotionZone && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-full bg-green-600/20 px-2 py-0.5 text-[10px] font-bold text-green-400"
            >
              {locale === "ko" ? "승급 임박" : "Promotion"}
            </motion.span>
          )}
          {ladderState.demotionZone && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] font-bold text-red-400"
            >
              {locale === "ko" ? "강등 위험" : "Demotion"}
            </motion.span>
          )}
        </div>

        {/* Points progress bar */}
        <div className="mb-1">
          <div className="mb-0.5 flex justify-between text-[10px] text-gray-500">
            <span>{ladderState.points.toLocaleString()} pts</span>
            <span>{nextPoints.toLocaleString()} pts</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${info.color}88, ${info.color})`,
              }}
            />
          </div>
        </div>

        {/* Weekly XP */}
        <div className="text-[10px] text-gray-500">
          {locale === "ko" ? "이번 주" : "This week"}: {ladderState.weeklyXp.toLocaleString()} XP
        </div>
      </motion.div>

      {/* Transition overlay */}
      <AnimatePresence>
        {transition && (
          <TransitionOverlay
            type={transition.type}
            league={transition.league}
            locale={locale}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
