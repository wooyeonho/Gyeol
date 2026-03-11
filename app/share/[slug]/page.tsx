"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";

type ShareCardData = {
  self_name: string;
  visual: { color?: string; shape?: string } | null;
  total_messages: number;
  vitality: number;
  gen_level: number;
  milestones: Array<{ type: string; label: string; at: string; summary?: string }>;
  week_messages: number;
};

export default function SharePage() {
  const { t } = useTranslations();
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [data, setData] = useState<ShareCardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/share/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
        else setError(true);
      })
      .catch(() => setError(true));
  }, [slug]);

  if (error || (!data && slug)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <p className="text-white/60">{t("sharePage.notFound")}</p>
        <Link href="/" className="mt-4 text-cyan-400 hover:underline">
          {t("sharePage.backHome")}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
      </div>
    );
  }

  const color = data.visual?.color ?? "rgb(34, 211, 238)";

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <article
          className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent p-6 shadow-xl"
          style={{ borderColor: `${color}40` }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: `${color}22`, color }}
            >
              {data.gen_level}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{data.self_name}</h1>
              <p className="text-sm text-white/50">Gen {data.gen_level} · 활력 {Math.round((data.vitality ?? 1) * 100)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-semibold" style={{ color }}>{data.total_messages}</p>
              <p className="text-xs text-white/50">{t("sharePage.messages")}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-semibold" style={{ color }}>{data.week_messages}</p>
              <p className="text-xs text-white/50">{t("sharePage.thisWeek")}</p>
            </div>
          </div>

          {data.milestones.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-white/50 mb-3">{t("sharePage.milestones")}</p>
              {data.milestones.slice(0, 5).map((m, i) => (
                <div
                  key={`${m.type}-${m.at}`}
                  className="flex gap-3 items-center rounded-xl bg-white/5 px-3 py-2"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.label}</p>
                    <p className="text-white/45 text-xs">
                      {new Date(m.at).toLocaleDateString("ko-KR", { dateStyle: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              href="/"
              className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors"
              style={{ background: `${color}20`, color }}
            >
              {t("sharePage.growWithGyeol")}
            </Link>
          </div>
        </article>

        <p className="mt-4 text-center text-white/40 text-xs">
          {t("sharePage.tagline")}
        </p>
      </div>
    </div>
  );
}
