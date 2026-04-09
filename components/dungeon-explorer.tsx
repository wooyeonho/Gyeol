"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCurrentDungeon,
  enterDungeon,
  resolveEncounter,
  advanceDungeonFloor,
  generateDailyEncounters,
  getActiveEncounters,
  type Dungeon,
  type Encounter,
} from "@/lib/game/encounter-system";
import { haptic } from "@/lib/micro-interactions";

const ENCOUNTER_ICONS: Record<string, string> = {
  treasure: "🎁",
  puzzle: "🧩",
  creature: "🐾",
  merchant: "🏪",
  event: "✨",
  boss: "👹",
};

const DIFFICULTY_COLORS = [
  "#4ade80", "#4ade80", "#fbbf24", "#fbbf24", "#f97316",
  "#f97316", "#ef4444", "#ef4444", "#dc2626", "#7c3aed",
];

interface DungeonExplorerProps {
  locale?: string;
}

export function DungeonExplorer({ locale = "ko" }: DungeonExplorerProps) {
  const [dungeon, setDungeon] = useState<Dungeon | null>(getCurrentDungeon);
  const [encounters, setEncounters] = useState<Encounter[]>(getActiveEncounters);
  const [resolvedRewards, setResolvedRewards] = useState<{ type: string; value: number; label: { ko: string; en: string } }[] | null>(null);
  const isKo = locale === "ko";

  const handleEnterDungeon = useCallback(() => {
    haptic("success");
    const d = enterDungeon(5);
    setDungeon(d);
  }, []);

  const handleResolveEncounter = useCallback((encId: string) => {
    haptic("tap");
    // First try dungeon encounters
    if (dungeon) {
      const floor = dungeon.floors[dungeon.currentFloor - 1];
      const enc = floor?.encounters.find((e) => e.id === encId);
      if (enc && !enc.resolved) {
        enc.resolved = true;
        // Save locally
        localStorage.setItem("gyeol_dungeon", JSON.stringify(dungeon));
        setDungeon({ ...dungeon });
        setResolvedRewards(enc.rewards);
        setTimeout(() => setResolvedRewards(null), 2500);
        return;
      }
    }
    // Try daily encounters
    const rewards = resolveEncounter(encId);
    if (rewards) {
      setEncounters(getActiveEncounters());
      setResolvedRewards(rewards);
      setTimeout(() => setResolvedRewards(null), 2500);
    }
  }, [dungeon]);

  const handleAdvanceFloor = useCallback(() => {
    const result = advanceDungeonFloor();
    if (result.success && result.dungeon) {
      haptic("success");
      setDungeon({ ...result.dungeon });
    }
  }, []);

  const handleGenerateDaily = useCallback(() => {
    haptic("tap");
    const enc = generateDailyEncounters();
    setEncounters(enc);
  }, []);

  const currentFloor = dungeon ? dungeon.floors[dungeon.currentFloor - 1] : null;
  const floorCleared = currentFloor?.encounters.every((e) => e.resolved) ?? false;

  return (
    <div className="space-y-4">
      {/* Reward popup */}
      <AnimatePresence>
        {resolvedRewards && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <div className="flex gap-3">
                  {resolvedRewards.map((r, i) => (
                    <span key={i} className="text-xs font-medium text-amber-300">
                      {isKo ? r.label.ko : r.label.en}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Encounters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {isKo ? "오늘의 탐험" : "Daily Encounters"}
          </p>
          {encounters.length === 0 && (
            <button
              type="button"
              onClick={handleGenerateDaily}
              className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] text-cyan-400 hover:bg-cyan-400/20"
            >
              {isKo ? "탐험 시작" : "Start Exploring"}
            </button>
          )}
        </div>
        {encounters.length > 0 && (
          <div className="space-y-2">
            {encounters.map((enc) => (
              <EncounterCard
                key={enc.id}
                encounter={enc}
                locale={locale}
                onResolve={() => handleResolveEncounter(enc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dungeon */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {isKo ? "던전" : "Dungeon"}
          </p>
          {!dungeon && (
            <button
              type="button"
              onClick={handleEnterDungeon}
              className="rounded-full bg-purple-400/10 px-3 py-1 text-[10px] text-purple-400 hover:bg-purple-400/20"
            >
              {isKo ? "던전 입장" : "Enter Dungeon"}
            </button>
          )}
        </div>

        {dungeon && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {/* Dungeon header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {isKo ? dungeon.name.ko : dungeon.name.en}
                </p>
                <p className="text-[10px] text-white/40">
                  {isKo ? `${dungeon.currentFloor}/${dungeon.totalFloors}층` : `Floor ${dungeon.currentFloor}/${dungeon.totalFloors}`}
                </p>
              </div>

              {/* Floor progress dots */}
              <div className="flex gap-1">
                {dungeon.floors.map((f) => (
                  <div
                    key={f.floor}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      f.cleared
                        ? "bg-emerald-400"
                        : f.floor === dungeon.currentFloor
                          ? "bg-cyan-400 animate-pulse"
                          : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Current floor encounters */}
            {currentFloor && (
              <div className="space-y-2">
                {currentFloor.encounters.map((enc) => (
                  <EncounterCard
                    key={enc.id}
                    encounter={enc}
                    locale={locale}
                    onResolve={() => handleResolveEncounter(enc.id)}
                  />
                ))}
              </div>
            )}

            {/* Advance button */}
            {floorCleared && dungeon.currentFloor < dungeon.totalFloors && (
              <motion.button
                type="button"
                onClick={handleAdvanceFloor}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 w-full rounded-xl bg-cyan-400/20 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-400/30 transition-all"
              >
                {isKo ? "다음 층으로" : "Next Floor"} →
              </motion.button>
            )}

            {/* Dungeon complete */}
            {floorCleared && dungeon.currentFloor === dungeon.totalFloors && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 rounded-xl bg-gradient-to-r from-amber-400/10 to-orange-400/10 p-3 text-center"
              >
                <span className="text-2xl">🏆</span>
                <p className="mt-1 text-sm font-semibold text-amber-300">
                  {isKo ? "던전 클리어!" : "Dungeon Cleared!"}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Individual encounter card */
function EncounterCard({
  encounter,
  locale = "ko",
  onResolve,
}: {
  encounter: Encounter;
  locale?: string;
  onResolve: () => void;
}) {
  const isKo = locale === "ko";
  const diffColor = DIFFICULTY_COLORS[Math.min(encounter.difficulty - 1, 9)];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border p-3 transition-all ${
        encounter.resolved
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{ENCOUNTER_ICONS[encounter.type] ?? "❓"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-white truncate">
              {isKo ? encounter.title.ko : encounter.title.en}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(encounter.difficulty, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: diffColor }}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-white/40 truncate">
            {isKo ? encounter.description.ko : encounter.description.en}
          </p>
        </div>

        {!encounter.resolved ? (
          <button
            type="button"
            onClick={onResolve}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-white/15 transition-all"
          >
            {encounter.type === "boss" ? (isKo ? "도전" : "Fight") : (isKo ? "탐험" : "Explore")}
          </button>
        ) : (
          <span className="text-xs text-emerald-400/60">✓</span>
        )}
      </div>
    </motion.div>
  );
}
