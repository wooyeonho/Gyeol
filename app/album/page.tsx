"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { formatLocalizedDate } from "@/lib/i18n/format";

type Milestone = { type: string; label: string; at: string; summary?: string };

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [config, setConfig] = useState<{ usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const { locale, t } = useTranslations();
  const appearance = resolveIdentityAppearance({ visual, config }, locale);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.albumOpened);
  }, []);

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.url) {
        setShareUrl(json.url);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(json.url);
        }
      }
    } finally {
      setShareLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/album")
      .then((r) => (r.ok ? r.json() : { milestones: [] }))
      .then((d) => {
        setMilestones(d.milestones ?? []);
        setVisual(d.visual ?? null);
        setConfig(d.config ?? null);
        setCreatedAt(typeof d.created === "string" ? d.created : null);
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, []);
  const timeline = useMemo(() => {
    const rows = milestones.slice(0, 6).map((milestone) => ({
      id: `${milestone.type}-${milestone.at}`,
      title: milestone.label,
      body: milestone.summary ?? t("album.defaultMilestoneBody"),
      at: milestone.at,
    }));
    if (appearance.usageLabel) {
      rows.push({
        id: "current-manifestation",
        title: appearance.title,
        body: appearance.usageNarrative ?? appearance.subtitle,
        at: config?.usage_profile?.updated_at ?? milestones[milestones.length - 1]?.at ?? createdAt ?? new Date().toISOString(),
      });
    }
    return rows;
  }, [appearance, config?.usage_profile?.updated_at, createdAt, milestones, t]);

  return (
    <div className="min-h-screen bg-black p-4 pb-24 text-white">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start gap-4">
            <IdentityPresence appearance={appearance} size="md" />
            <div>
              <h1 className="mb-2 text-xl font-semibold">{t("album.title")}</h1>
              <p className="text-sm text-white/50">{t("album.subtitle")}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">{appearance.title}</p>
              {appearance.usageNarrative && (
                <p className="mt-2 text-xs leading-5 text-white/56">{appearance.usageNarrative}</p>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/20 opacity-75"></span>
              <span className="relative inline-flex h-8 w-8 rounded-full bg-white/40"></span>
            </div>
            <p className="text-sm font-medium text-white/50 animate-pulse">기억을 불러오는 중...</p>
          </div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.02] px-6 py-20 text-center shadow-inner">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] shadow-[0_0_30px_rgba(255,255,255,0.03)] text-white/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-white/80">{t("album.emptyTitle") || "아직 앨범이 비어있습니다"}</h3>
            <p className="text-sm text-white/40 max-w-[260px]">
              {t("album.empty") || "결이 성장하며 마주하는 첫 순간들이 이곳에 사진처럼 기록될 거예요."}
            </p>
          </div>
        ) : (
          <>
          <div className="mb-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              {t("album.timelineEyebrow")}
            </p>
            <div className="mt-4 space-y-4">
              {timeline.map((item, index) => (
                <div key={item.id} className="relative pl-8">
                  {index < timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-[calc(100%+0.5rem)] w-px bg-white/10" />
                  )}
                  <div
                    className="absolute left-0 top-1 h-6 w-6 rounded-full border"
                    style={{
                      borderColor: `${appearance.palette.primary}45`,
                      background: `${appearance.palette.primary}22`,
                    }}
                  />
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {formatLocalizedDate(item.at, locale)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/66">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-4">
            {milestones.map((m, i) => (
              <li
                key={`${m.type}-${m.at}`}
                className="flex gap-4 items-start rounded-xl bg-white/5 p-4 border border-white/10"
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium"
                  style={{ background: visual?.color ? `${visual.color}33` : "rgba(255,255,255,0.1)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{m.label}</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {formatLocalizedDate(m.at, locale, { dateStyle: "medium" })}
                  </p>
                  {m.summary && <p className="text-white/70 text-sm mt-2 truncate">{m.summary}</p>}
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
        {milestones.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={shareLoading}
              className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {shareLoading ? "..." : shareUrl ? t("album.shareReady") : t("album.shareAction")}
            </button>
            <Link
              href="/"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              {t("album.home")}
            </Link>
            <Link
              href="/activity"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              {t("album.activity")}
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
