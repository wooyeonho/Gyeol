"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDailyQuests } from "@/lib/rewards/daily-quest";
import { haptic, playSound } from "@/lib/micro-interactions";

type DailyQuestPanelProps = {
  locale: string;
};

export function DailyQuestPanel({ locale }: DailyQuestPanelProps) {
  const [questState, setQuestState] = useState(() => getDailyQuests());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setQuestState(getDailyQuests());
  }, []);

  const allCompleted = questState.quests.every((q) => q.completed);
  const completedCount = questState.quests.filter((q) => q.completed).length;
  const totalReward = questState.quests.reduce((sum, q) => sum + q.reward, 0);

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
          haptic("tap");
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className="text-sm font-medium text-white/90">
            {locale === "ko" ? "오늘의 퀘스트" : "Daily Quests"}
          </span>
          <span className="text-xs text-white/40">
            {completedCount}/{questState.quests.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allCompleted && (
            <motion.span
              className="text-xs text-emerald-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              ✓
            </motion.span>
          )}
          <motion.span
            className="text-white/40 text-xs"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </div>
      </button>

      {/* Quest list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {questState.quests.map((quest, i) => (
                <motion.div
                  key={quest.id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                      quest.completed
                        ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-400"
                        : "border-white/20 text-white/30"
                    }`}
                  >
                    {quest.completed ? "✓" : ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${quest.completed ? "text-white/40 line-through" : "text-white/80"}`}>
                      {quest.title[locale] ?? quest.title.en}
                    </p>
                    {!quest.completed && quest.target > 1 && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyan-400/60 transition-all duration-300"
                            style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/35">
                          {quest.progress}/{quest.target}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-300/60">+{quest.reward}</span>
                </motion.div>
              ))}

              {/* Bonus for completing all */}
              <div className="flex items-center justify-between pt-1 border-t border-white/8">
                <span className="text-[10px] text-white/40">
                  {locale === "ko" ? "전체 완료 보너스" : "All complete bonus"}
                </span>
                <span className={`text-[10px] font-medium ${allCompleted ? "text-amber-300" : "text-white/30"}`}>
                  +{Math.round(totalReward * 0.5)} bonus
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
