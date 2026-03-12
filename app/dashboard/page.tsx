"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/i18n-provider";

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
  const { t } = useTranslations();

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
      <h1 className="mb-2 text-2xl font-bold">{t("dashboard.title")}</h1>
      <p className="mb-8 text-sm text-white/50">{t("dashboard.subtitle")}</p>

      {loading ? (
        <p className="text-white/50">{t("dashboard.loading")}</p>
      ) : data ? (
        <div className="grid max-w-3xl gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{t("dashboard.eyebrow")}</p>
            <h2 className="mt-3 text-xl font-semibold">
              {t("dashboard.heroTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {t("dashboard.heroBody")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">{t("dashboard.agentCount")}</p>
              <p className="mt-2 text-3xl font-semibold">{data.agent_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">{t("dashboard.socialCount")}</p>
              <p className="mt-2 text-3xl font-semibold">{data.social_count ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">{t("dashboard.artifacts")}</p>
              <p className="mt-2 text-3xl font-semibold">{data.artifact_count ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider">{t("dashboard.weather")}</p>
              <p className="mt-2 text-2xl font-semibold">{data.weather_name ?? "-"}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">{t("dashboard.emotion")}</p>
              {data.collective_emotion && Object.keys(data.collective_emotion).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.collective_emotion).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                      {k}: {(Number(v) * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/55">{t("dashboard.unavailable")}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-white/50">{t("dashboard.unavailable")}</p>
      )}
    </div>
  );
}
