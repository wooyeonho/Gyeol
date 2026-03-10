"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  agent_count: number;
  social_count: number;
  collective_emotion?: Record<string, number>;
  weather_name?: string;
  artifact_count?: number;
  autonomy_enabled_count?: number;
  stale_heartbeat_6h?: number;
  stale_dream_24h?: number;
  echo_count?: number;
  cron_freshness?: Array<{ job_name: string; minutes_since_update: number }>;
  autonomy_health?: { score: number; tier: "healthy" | "warning" | "critical"; reasons: string[] };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="mb-2 text-2xl font-bold">결 공개 대시보드</h1>
      <p className="mb-8 text-sm text-white/50">로그인 없이 볼 수 있는 실시간 공개 지표입니다.</p>

      {loading ? (
        <p className="text-white/50">불러오는 중...</p>
      ) : data ? (
        <div className="grid gap-4 max-w-2xl">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">전체 결 수</p>
            <p className="text-3xl font-semibold">{data.agent_count ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">소셜 상호작용</p>
            <p className="text-3xl font-semibold">{data.social_count ?? 0}</p>
          </div>
          {data.weather_name && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">월드 날씨</p>
              <p className="text-xl">{data.weather_name}</p>
            </div>
          )}
          {data.collective_emotion && Object.keys(data.collective_emotion).length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">집단 감정</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.collective_emotion).map(([k, v]) => (
                  <span key={k} className="bg-white/10 rounded-full px-3 py-1 text-sm">
                    {k}: {(Number(v) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.artifact_count != null && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">아티팩트 수</p>
              <p className="text-2xl font-semibold">{data.artifact_count}</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white/5 rounded-xl p-4 sm:col-span-2">
              <p className="text-white/50 text-xs uppercase tracking-wider">자율성 건강 점수</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-3xl font-semibold">{data.autonomy_health?.score ?? 0}</p>
                <span
                  className={`text-xs rounded-full px-2 py-1 border ${
                    data.autonomy_health?.tier === "healthy"
                      ? "border-emerald-300/40 text-emerald-200 bg-emerald-500/10"
                      : data.autonomy_health?.tier === "warning"
                        ? "border-amber-300/40 text-amber-200 bg-amber-500/10"
                        : "border-red-300/40 text-red-200 bg-red-500/10"
                  }`}
                >
                  {data.autonomy_health?.tier ?? "critical"}
                </span>
              </div>
              {Array.isArray(data.autonomy_health?.reasons) && data.autonomy_health!.reasons.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-white/70 space-y-1">
                  {data.autonomy_health!.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">자율 모드 활성</p>
              <p className="text-2xl font-semibold">{data.autonomy_enabled_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Echo 에이전트</p>
              <p className="text-2xl font-semibold">{data.echo_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">오래된 heartbeat (6h)</p>
              <p className="text-2xl font-semibold">{data.stale_heartbeat_6h ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">오래된 dream (24h)</p>
              <p className="text-2xl font-semibold">{data.stale_dream_24h ?? 0}</p>
            </div>
          </div>
          {Array.isArray(data.cron_freshness) && data.cron_freshness.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">크론 최신성</p>
              <div className="space-y-2">
                {data.cron_freshness.map((job) => (
                  <div key={job.job_name} className="flex items-center justify-between text-sm">
                    <span>{job.job_name.replace("cron:", "")}</span>
                    <span className={job.minutes_since_update > 360 ? "text-red-300" : "text-white/70"}>
                      {job.minutes_since_update}분 전
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/50">대시보드를 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
