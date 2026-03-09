"use client";

import { useState } from "react";
import TimeTravelChat from "@/components/time-travel-chat";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TimeTravelPage() {
  const [targetDate, setTargetDate] = useState("");
  const [started, setStarted] = useState(false);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultDate = threeMonthsAgo.toISOString().slice(0, 10);

  return (
    <div className="min-h-dvh bg-black text-white p-4 pb-12">
      <div className="max-w-lg mx-auto pt-12">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">시간 여행</h1>
          <p className="text-sm text-white/40 mt-1">과거의 자신과 대화해 보세요</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          {!started ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-2">목표 날짜</label>
                <input
                  type="date"
                  value={targetDate || defaultDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="w-full py-3.5 rounded-xl gradient-accent text-white text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-accent/20"
              >
                대화 시작
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <TimeTravelChat
                targetDate={targetDate || defaultDate}
                onClose={() => setStarted(false)}
              />
              <button
                type="button"
                onClick={() => setStarted(false)}
                className="w-full py-2.5 rounded-xl glass text-white/50 text-xs font-medium transition-all hover:bg-white/10"
              >
                다른 날짜 선택
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            홈으로 돌아가기
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
