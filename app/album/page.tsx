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
import { ManifestationTimeline } from "@/components/manifestation-timeline";

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
          <div className="flex justify-center py-12">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-6 text-center text-white/50 text-sm">
            {t("album.empty")}
          </div>
        ) : (
          <>
          <div className="mb-6">
            <ManifestationTimeline />
          </div>
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
      </div>
      <BottomNav />
    </div>
  );
}
