"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { DiscussInChatButton } from "@/components/discover/discuss-in-chat";
import { formatLocalizedDate } from "@/lib/i18n/format";
import { ManifestationTimeline } from "@/components/manifestation-timeline";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { getRarity, getCollectionCompleteness } from "@/lib/album/rarity";

type Milestone = { type: string; label: string; at: string; summary?: string };

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [config, setConfig] = useState<{ usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const { locale, t } = useTranslations();
  const appearance = resolveIdentityAppearance({ visual, config }, locale);
  const completeness = useMemo(
    () => getCollectionCompleteness(milestones.map((m) => m.type)),
    [milestones]
  );

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.albumOpened);
  }, []);

  async function handleShare() {
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.url) {
        setShareUrl(json.url);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(json.url);
        }
      } else {
        setShareError(
          (json && typeof json.error === "string" ? json.error : null) ??
            t("album.shareFailed")
        );
      }
    } catch {
      setShareError(t("album.shareFailed"));
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
    <div className="theme-page min-h-screen px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <DiscoverPageHeader
          eyebrow={appearance.title}
          title={t("album.title")}
          subtitle={appearance.usageNarrative ?? t("album.subtitle")}
          appearance={appearance}
        >
          <DiscussInChatButton
            prompt={t("discover.discussThisPrompt")
              .replace("{name}", appearance.title)
              .replace("{page}", t("album.title"))}
            label={t("discover.discussHere")}
            variant="ghost"
          />
        </DiscoverPageHeader>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : milestones.length === 0 ? (
          <AnimatedEmptyState
            icon="album"
            title={t("album.empty")}
            description={t("album.emptyDesc")}
            accentColor="#a78bfa"
          />
        ) : (
          <>
          {/* Collection completeness bar */}
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("album.collectionEyebrow")}
              </p>
              <span className="text-xs font-medium" style={{ color: appearance.palette.primary }}>
                {completeness.collected}/{completeness.total}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completeness.percent}%`,
                  background: `linear-gradient(90deg, ${appearance.palette.primary}, ${appearance.palette.secondary})`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              {t("album.collectionProgress").replace("{percent}", String(completeness.percent))}
            </p>
          </div>
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
            {milestones.map((m, i) => {
              const rarity = getRarity(m.type);
              return (
              <li
                key={`${m.type}-${m.at}`}
                className="flex gap-4 items-start rounded-xl p-4 border transition-all"
                style={{
                  background: rarity.glow,
                  borderColor: `${rarity.color}30`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium"
                  style={{ background: `${rarity.color}25`, color: rarity.color }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{m.label}</p>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: `${rarity.color}20`, color: rarity.color }}
                    >
                      {rarity.label[locale === "ko" ? "ko" : "en"] /* rarity labels are static config, not i18n */}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mt-0.5">
                    {formatLocalizedDate(m.at, locale, { dateStyle: "medium" })}
                  </p>
                  {m.summary && <p className="text-white/70 text-sm mt-2 truncate">{m.summary}</p>}
                </div>
              </li>
              );
            })}
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
          {shareError && (
            <span className="text-xs text-red-300 self-center">{shareError}</span>
          )}
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
