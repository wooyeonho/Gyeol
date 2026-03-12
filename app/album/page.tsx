"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type Milestone = { type: string; label: string; at: string; summary?: string };

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const { locale, t } = useTranslations();
  const appearance = resolveIdentityAppearance({ visual }, locale);

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
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, []);

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
                    {new Date(m.at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  {m.summary && <p className="text-white/70 text-sm mt-2 truncate">{m.summary}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={shareLoading}
            className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {shareLoading ? "..." : shareUrl ? "링크 복사됨" : "성장 카드 공유"}
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
