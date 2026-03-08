"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  agent_count: number;
  social_count: number;
  collective_emotion?: Record<string, number>;
  weather_name?: string;
  artifact_count?: number;
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
      <h1 className="text-2xl font-bold mb-2">GYEOL Dashboard</h1>
      <p className="text-white/50 text-sm mb-8">Public real-time metrics. No auth required.</p>

      {loading ? (
        <p className="text-white/50">Loading...</p>
      ) : data ? (
        <div className="grid gap-4 max-w-2xl">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">Total Gyeol</p>
            <p className="text-3xl font-semibold">{data.agent_count ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">Social Encounters</p>
            <p className="text-3xl font-semibold">{data.social_count ?? 0}</p>
          </div>
          {data.weather_name && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">World Weather</p>
              <p className="text-xl">{data.weather_name}</p>
            </div>
          )}
          {data.collective_emotion && Object.keys(data.collective_emotion).length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Collective Emotion</p>
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
              <p className="text-white/50 text-xs uppercase tracking-wider">Artifacts</p>
              <p className="text-2xl font-semibold">{data.artifact_count}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/50">Unable to load dashboard.</p>
      )}
    </div>
  );
}
