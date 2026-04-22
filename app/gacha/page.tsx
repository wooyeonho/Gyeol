"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ScratchCard } from "@/components/scratch-card";
import { SpinWheel } from "@/components/spin-wheel";

const WEEKLY_SCRATCH_REWARD = {
  label: "주간 보너스",
  emoji: "🎁",
  value: "200 코인 + 희귀 아이템",
};

export default function GachaPage() {
  const [tab, setTab] = useState<"scratch" | "spin">("scratch");
  const [scratchDone, setScratchDone] = useState(false);
  const [spinDone, setSpinDone] = useState(false);

  const trackReward = useCallback(() => {
    fetch("/api/reward/track", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] aurora-bg-hero px-4 pt-8 pb-24">
      <div className="mx-auto max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">가챠 🎰</h1>
          <p className="mt-1 text-sm text-white/40">매주 무료 보상을 받아보세요</p>
        </div>

        {/* Tabs */}
        <div className="flex glass-card rounded-xl p-1 mb-6">
          {(["scratch", "spin"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {t === "scratch" ? "🪙 스크래치" : "🎡 스핀 휠"}
            </button>
          ))}
        </div>

        {tab === "scratch" && (
          <motion.div
            key="scratch"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-xs text-white/30 text-center">
              {scratchDone ? "이번 주 스크래치 완료!" : "긁어서 보상을 확인하세요"}
            </p>
            <ScratchCard
              reward={WEEKLY_SCRATCH_REWARD}
              onRevealed={() => { setScratchDone(true); trackReward(); }}
            />
            {scratchDone && (
              <motion.div
                className="text-center text-sm text-amber-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                🎉 보상이 지갑에 추가됐어요!
              </motion.div>
            )}
          </motion.div>
        )}

        {tab === "spin" && (
          <motion.div
            key="spin"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SpinWheel
              canSpin={!spinDone}
              onResult={() => { setSpinDone(true); trackReward(); }}
            />
          </motion.div>
        )}

        {/* Weekly reset notice */}
        <p className="mt-8 text-center text-[10px] text-white/20">
          매주 월요일 00:00에 초기화돼요
        </p>
      </div>
    </main>
  );
}
