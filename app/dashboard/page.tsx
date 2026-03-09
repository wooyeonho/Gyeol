"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type DashboardData = {
  agent_count: number;
  social_count: number;
  collective_emotion?: Record<string, number>;
  weather_name?: string;
  artifact_count?: number;
};

function MetricCard({ label, value, icon, delay = 0 }: {
  label: string; value: string | number; icon: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-2xl p-5 gradient-border"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</span>
        <div className="text-accent-light/60">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-dvh bg-black text-white p-6 pb-12">
      <div className="max-w-2xl mx-auto pt-10">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">GYEOL 세계의 실시간 현황</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3 mt-8">
            <MetricCard
              label="전체 생명체"
              value={data.agent_count ?? 0}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
              delay={0.1}
            />
            <MetricCard
              label="소셜 만남"
              value={data.social_count ?? 0}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
              delay={0.15}
            />
            {data.artifact_count != null && (
              <MetricCard
                label="창작물"
                value={data.artifact_count}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                delay={0.2}
              />
            )}
            {data.weather_name && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-2xl p-5"
              >
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">세계 날씨</span>
                <div className="text-lg font-semibold text-white mt-2">{data.weather_name}</div>
              </motion.div>
            )}
            {data.collective_emotion && Object.keys(data.collective_emotion).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-5 col-span-2"
              >
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">집단 감정</span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(data.collective_emotion).map(([k, v]) => (
                    <span key={k} className="glass rounded-full px-3 py-1 text-xs font-medium text-white/70">
                      {k} <span className="text-accent-light">{(Number(v) * 100).toFixed(0)}%</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm">데이터를 불러올 수 없어요</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
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
