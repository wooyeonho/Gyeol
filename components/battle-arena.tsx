"use client";

/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/exhaustive-deps */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BATTLE_MOVES, calculateCombo, calculateMoveDamage, type MoveType, type ComboMove } from "@/lib/game/combo-system";
import { calculateBattleResult, getRankTitle, type BattleCreature } from "@/lib/game/pvp-system";
import { haptic } from "@/lib/micro-interactions";

interface BattleArenaProps {
  playerCreature: BattleCreature;
  opponentCreature: BattleCreature;
  playerRating?: number;
  opponentRating?: number;
  locale?: string;
  onBattleEnd?: (won: boolean) => void;
}

type BattlePhase = "select" | "animating" | "result";

interface TurnLog {
  move: ComboMove;
  damage: number;
  comboName: string | null;
  comboMultiplier: number;
}

export function BattleArena({
  playerCreature,
  opponentCreature,
  playerRating = 1000,
  opponentRating = 1000,
  locale = "ko",
  onBattleEnd,
}: BattleArenaProps) {
  const isKo = locale === "ko";
  const [phase, setPhase] = useState<BattlePhase>("select");
  const [playerHp, setPlayerHp] = useState(playerCreature.stats.hp);
  const [opponentHp, setOpponentHp] = useState(opponentCreature.stats.hp);
  const [recentMoves, setRecentMoves] = useState<MoveType[]>([]);
  const [turnLogs, setTurnLogs] = useState<TurnLog[]>([]);
  const [battleResult, setBattleResult] = useState<ReturnType<typeof calculateBattleResult> | null>(null);
  const [comboFlash, setComboFlash] = useState<string | null>(null);

  const playerMaxHp = playerCreature.stats.hp;
  const opponentMaxHp = opponentCreature.stats.hp;
  const playerRank = getRankTitle(playerRating);
  const opponentRank = getRankTitle(opponentRating);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleMove = useCallback(
    (move: ComboMove) => {
      if (phase !== "select") return;
      haptic("tap");

      const nextMoves = [...recentMoves, move.type];
      setRecentMoves(nextMoves);
      const combo = calculateCombo(nextMoves);

      // Calculate player damage
      const playerDmg = calculateMoveDamage(move, combo, playerCreature.stats.atk, opponentCreature.stats.def);

      // Opponent auto-selects a move
      const opponentMove = BATTLE_MOVES[Math.floor(Math.random() * BATTLE_MOVES.length)];
      const opponentCombo = calculateCombo([opponentMove.type]);
      const opponentDmg = calculateMoveDamage(opponentMove, opponentCombo, opponentCreature.stats.atk, playerCreature.stats.def);

      // Show combo flash
      if (combo.comboName) {
        const name = isKo ? combo.comboName.ko : combo.comboName.en;
        setComboFlash(name);
        setTimeout(() => setComboFlash(null), 1500);
      }

      setTurnLogs((prev) => [
        ...prev,
        {
          move,
          damage: playerDmg,
          comboName: combo.comboName ? (isKo ? combo.comboName.ko : combo.comboName.en) : null,
          comboMultiplier: combo.multiplier,
        },
      ]);

      setPhase("animating");

      // Apply damage with animation delay
      const newOpponentHp = Math.max(0, opponentHp - playerDmg);
      const newPlayerHp = Math.max(0, playerHp - opponentDmg);

      // Clear existing timeouts related to battle
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      const t1 = setTimeout(() => {
        setOpponentHp(newOpponentHp);
      }, 300);
      timeoutsRef.current.push(t1);

      const t2 = setTimeout(() => {
        setPlayerHp(newPlayerHp);
      }, 600);
      timeoutsRef.current.push(t2);

      // Check for battle end — determine winner by actual HP outcome
      const t3 = setTimeout(() => {
        if (newOpponentHp <= 0 || newPlayerHp <= 0) {
          const playerWon = newOpponentHp <= 0 && (newPlayerHp > 0 || newOpponentHp <= newPlayerHp);
          const winner = playerWon ? playerCreature : opponentCreature;
          const loser = playerWon ? opponentCreature : playerCreature;
          const result = {
            winner,
            loser,
            ratingChange: 32,
            highlights: [] as ReturnType<typeof calculateBattleResult>["highlights"],
            winnerDamageDealt: playerWon ? (opponentMaxHp - newOpponentHp) : (playerMaxHp - newPlayerHp),
            loserDamageDealt: playerWon ? (playerMaxHp - newPlayerHp) : (opponentMaxHp - newOpponentHp),
          };
          setBattleResult(result);
          setPhase("result");
          setRecentMoves([]); // Reset recent moves after battle
          // Sync battle result to server
          fetch("/api/room/battle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: playerCreature.name,
              opponentId: opponentCreature.name,
              moveType: nextMoves[nextMoves.length - 1] || "strike",
            }),
          }).catch(() => {});
          onBattleEnd?.(playerWon);
        } else {
          setPhase("select");
        }
      }, 900);
      timeoutsRef.current.push(t3);
    },
    [phase, recentMoves, playerHp, opponentHp, playerCreature, opponentCreature, isKo, onBattleEnd, playerMaxHp, opponentMaxHp],
  );

  const hpBarColor = (current: number, max: number) => {
    const pct = current / max;
    if (pct > 0.5) return "bg-emerald-400";
    if (pct > 0.25) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-950/40 to-black/60 p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-sm font-bold text-white/90">
          {isKo ? "크리처 배틀" : "Creature Battle"}
        </h2>
        {comboFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            className="text-lg font-black text-amber-300 mt-1"
          >
            {comboFlash}!
          </motion.div>
        )}
      </div>

      {/* Opponent creature */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-300">{opponentCreature.name}</span>
            <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">
              Lv.{opponentCreature.level}
            </span>
            <span className="text-[9px] text-white/40">{opponentRank.tier}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${hpBarColor(opponentHp, opponentMaxHp)}`}
              animate={{ width: `${(opponentHp / opponentMaxHp) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-white/40">{opponentHp}/{opponentMaxHp} HP</span>
        </div>
        <div className="text-3xl">
          {opponentCreature.dominantType === "analytical" ? "🧠" :
           opponentCreature.dominantType === "creative" ? "🎨" :
           opponentCreature.dominantType === "social" ? "💬" :
           opponentCreature.dominantType === "emotional" ? "❤️" : "⚖️"}
        </div>
      </div>

      {/* VS divider */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-bold text-white/30">VS</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Player creature */}
      <div className="flex items-center gap-3">
        <div className="text-3xl">
          {playerCreature.dominantType === "analytical" ? "🧠" :
           playerCreature.dominantType === "creative" ? "🎨" :
           playerCreature.dominantType === "social" ? "💬" :
           playerCreature.dominantType === "emotional" ? "❤️" : "⚖️"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-cyan-300">{playerCreature.name}</span>
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300">
              Lv.{playerCreature.level}
            </span>
            <span className="text-[9px] text-white/40">{playerRank.tier}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${hpBarColor(playerHp, playerMaxHp)}`}
              animate={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-white/40">{playerHp}/{playerMaxHp} HP</span>
        </div>
      </div>

      {/* Combo counter */}
      {recentMoves.length >= 2 && (
        <div className="text-center text-[10px] text-amber-300/60">
          {isKo ? "콤보" : "Combo"}: {recentMoves.length} {isKo ? "연속" : "chain"}
        </div>
      )}

      {/* Move selection */}
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="moves"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-3 gap-2"
          >
            {BATTLE_MOVES.filter((m) => (m.type !== "heal" && m.type !== "guard") || BATTLE_MOVES.indexOf(m) < 4).slice(0, 5).map((move) => (
              <button
                key={move.type}
                type="button"
                onClick={() => handleMove(move)}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center transition-all hover:bg-white/[0.12] active:scale-95"
              >
                <div className="text-lg">
                  {move.type === "strike" ? "⚔️" :
                   move.type === "guard" ? "🛡️" :
                   move.type === "magic" ? "✨" :
                   move.type === "speed" ? "💨" : "💚"}
                </div>
                <div className="mt-1 text-[10px] font-medium text-white/70">
                  {isKo ? move.name.ko : move.name.en}
                </div>
                {move.basePower > 0 && (
                  <div className="text-[9px] text-white/40">PWR {move.basePower}</div>
                )}
              </button>
            ))}
          </motion.div>
        )}

        {phase === "animating" && (
          <motion.div
            key="animating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-white/20 border-t-cyan-400"
            />
          </motion.div>
        )}

        {phase === "result" && battleResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center space-y-3"
          >
            <div className="text-2xl">
              {battleResult.winner === playerCreature ? "🏆" : "💀"}
            </div>
            <div className="text-sm font-bold text-white/90">
              {battleResult.winner === playerCreature
                ? (isKo ? "승리!" : "Victory!")
                : (isKo ? "패배..." : "Defeat...")}
            </div>
            <div className="space-y-1">
              {battleResult.highlights.map((h, i) => (
                <p key={i} className="text-xs text-white/50">
                  {isKo ? h.message.ko : h.message.en}
                </p>
              ))}
            </div>
            <div className="flex justify-center gap-4 text-[10px] text-white/40">
              <span>{isKo ? "내 데미지" : "Your DMG"}: {battleResult.winnerDamageDealt}</span>
              <span>{isKo ? "상대 데미지" : "Opp DMG"}: {battleResult.loserDamageDealt}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn log */}
      {turnLogs.length > 0 && (
        <div className="max-h-24 overflow-y-auto space-y-1">
          {turnLogs.slice(-5).map((log, i) => (
            <div key={i} className="text-[10px] text-white/40">
              {isKo ? log.move.name.ko : log.move.name.en} → {log.damage} DMG
              {log.comboName && (
                <span className="ml-1 text-amber-300/70">({log.comboName} x{log.comboMultiplier})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
