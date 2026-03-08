"use client";

import { useState } from "react";
import TimeTravelChat from "@/components/time-travel-chat";
import Link from "next/link";

export default function TimeTravelPage() {
  const [targetDate, setTargetDate] = useState("");
  const [started, setStarted] = useState(false);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultDate = threeMonthsAgo.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold mb-2">타임 트래블</h1>
        <p className="text-white/50 text-sm mb-6">선택한 날짜의 나와 대화해 보세요.</p>
        {!started ? (
          <div className="space-y-4">
            <label className="block text-sm text-white/70">목표 날짜</label>
            <input
              type="date"
              value={targetDate || defaultDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white"
            />
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="w-full rounded-xl bg-white/10 py-3 font-medium text-white"
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
              className="w-full rounded-xl bg-white/5 py-2 text-sm text-white/70"
            >
              날짜 다시 고르기
            </button>
          </div>
        )}
        <div className="mt-6">
          <Link href="/" className="text-white/50 text-sm hover:text-white/80">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
