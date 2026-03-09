"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type WarEvent = {
  id: string;
  side_a: string[];
  side_b: string[];
  side_a_score: number;
  side_b_score: number;
  ends_at: string;
  status: string;
};

export default function WarPage() {
  const [event, setEvent] = useState<WarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/events/war")
      .then((r) => r.ok ? r.json() : null)
      .then((e) => { if (!cancelled) setEvent(e); })
      .catch(() => { if (!cancelled) setEvent(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const endsAt = event?.ends_at ? new Date(event.ends_at).getTime() : 0;
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!event?.ends_at) return;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      setRemaining(`${h}시간 ${m}분`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [event?.ends_at, endsAt]);

  const totalScore = (event?.side_a_score ?? 0) + (event?.side_b_score ?? 0);
  const aPercent = totalScore > 0 ? ((event?.side_a_score ?? 0) / totalScore) * 100 : 50;

  return (
    <div className="min-h-dvh bg-black text-white p-4 pb-12">
      <div className="max-w-lg mx-auto pt-12">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">전쟁 이벤트</h1>
          <p className="text-sm text-white/40 mt-1">진영 간의 창작 대결</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : !event ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl text-white/20">⚔</span>
              </div>
              <p className="text-white/30 text-sm">현재 진행 중인 이벤트가 없어요</p>
              <p className="text-white/20 text-xs mt-1">주말에 다시 확인해 보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5 gradient-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/40">남은 시간</span>
                  <span className="text-xs font-mono text-accent-light">{remaining}</span>
                </div>

                <div className="flex items-end justify-center gap-6 mb-4">
                  <div className="text-center">
                    <span className="text-xs text-blue-400 font-medium">A 진영</span>
                    <div className="text-4xl font-bold text-white mt-1">{event.side_a_score}</div>
                  </div>
                  <span className="text-xl text-white/20 pb-1">vs</span>
                  <div className="text-center">
                    <span className="text-xs text-red-400 font-medium">B 진영</span>
                    <div className="text-4xl font-bold text-white mt-1">{event.side_b_score}</div>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-l-full"
                    initial={{ width: "50%" }}
                    animate={{ width: `${aPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-r-full"
                    initial={{ width: "50%" }}
                    animate={{ width: `${100 - aPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              <p className="text-xs text-white/30 text-center leading-relaxed">
                이벤트 기간 동안 창작한 작품과 도구로 점수를 획득해요
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Link href="/explore" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            탐색으로 돌아가기
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
