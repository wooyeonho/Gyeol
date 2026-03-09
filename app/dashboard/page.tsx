"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFallbackDashboard } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

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
  const [demoMode, setDemoMode] = useState(false);
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const quests = useRelationshipOsStore((state) => state.quests);
  const autonomousMode = useRelationshipOsStore((state) => state.autonomousMode);

  const fallback = useMemo(
    () =>
      buildFallbackDashboard({
        profiles,
        promises,
        approvals,
        captures,
        stories,
        quests,
        autonomousMode,
      }),
    [approvals, autonomousMode, captures, profiles, promises, quests, stories],
  );
  const currentData: DashboardData = data ?? fallback;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) {
          if (!cancelled) setDemoMode(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setDemoMode(true);
      })
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
      ) : (data || (demoMode && hasHydrated)) ? (
        <div className="grid gap-4 max-w-2xl">
          {demoMode && (
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-4 py-3 text-sm text-white/78">
              실데이터 연결 전이라 Relationship OS 스냅샷 기반 데모 지표를 보여주고 있습니다.
            </div>
          )}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">Total Gyeol</p>
            <p className="text-3xl font-semibold">{currentData.agent_count ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider">Social Encounters</p>
            <p className="text-3xl font-semibold">{currentData.social_count ?? 0}</p>
          </div>
          {currentData.weather_name && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">World Weather</p>
              <p className="text-xl">{currentData.weather_name}</p>
            </div>
          )}
          {currentData.collective_emotion && Object.keys(currentData.collective_emotion ?? {}).length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Collective Emotion</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentData.collective_emotion ?? {}).map(([k, v]) => (
                  <span key={k} className="bg-white/10 rounded-full px-3 py-1 text-sm">
                    {k}: {(Number(v) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}
          {currentData.artifact_count != null && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Artifacts</p>
              <p className="text-2xl font-semibold">{currentData.artifact_count}</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white/5 rounded-xl p-4 sm:col-span-2">
              <p className="text-white/50 text-xs uppercase tracking-wider">Autonomy Health Score</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-3xl font-semibold">{currentData.autonomy_health?.score ?? 0}</p>
                <span
                  className={`text-xs rounded-full px-2 py-1 border ${
                    currentData.autonomy_health?.tier === "healthy"
                      ? "border-emerald-300/40 text-emerald-200 bg-emerald-500/10"
                      : currentData.autonomy_health?.tier === "warning"
                        ? "border-amber-300/40 text-amber-200 bg-amber-500/10"
                        : "border-red-300/40 text-red-200 bg-red-500/10"
                  }`}
                >
                  {currentData.autonomy_health?.tier ?? "critical"}
                </span>
              </div>
              {Array.isArray(currentData.autonomy_health?.reasons) && (currentData.autonomy_health?.reasons.length ?? 0) > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-white/70 space-y-1">
                  {currentData.autonomy_health!.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Autonomy Enabled</p>
              <p className="text-2xl font-semibold">{currentData.autonomy_enabled_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Echo Agents</p>
              <p className="text-2xl font-semibold">{currentData.echo_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Stale Heartbeat (6h)</p>
              <p className="text-2xl font-semibold">{currentData.stale_heartbeat_6h ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">Stale Dream (24h)</p>
              <p className="text-2xl font-semibold">{currentData.stale_dream_24h ?? 0}</p>
            </div>
          </div>
          {Array.isArray(currentData.cron_freshness) && (currentData.cron_freshness?.length ?? 0) > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Cron Freshness</p>
              <div className="space-y-2">
                {currentData.cron_freshness!.map((job: { job_name: string; minutes_since_update: number }) => (
                  <div key={job.job_name} className="flex items-center justify-between text-sm">
                    <span>{job.job_name.replace("cron:", "")}</span>
                    <span className={job.minutes_since_update > 360 ? "text-red-300" : "text-white/70"}>
                      {job.minutes_since_update}m ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/50">Unable to load dashboard.</p>
      )}
    </div>
  );
}
