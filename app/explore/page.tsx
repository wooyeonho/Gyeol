"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { BottomNav } from "@/components/bottom-nav";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { DiscussInChatButton } from "@/components/discover/discuss-in-chat";

type Agent = {
  id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
  species?: string | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
};
type ExploreProfile = {
  id: string;
  self_name?: string | null;
  vitality?: number;
  total_messages?: number;
  gen_level?: number;
  species?: string | null;
  visual?: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
};

export default function ExplorePage() {
  const { locale, t } = useTranslations();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.exploreOpened);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/explore");
        if (!res.ok) {
          setError(t("explore.loadError"));
          setAgents([]);
          return;
        }
        const json = await res.json().catch(() => ({ profiles: [] }));
        const profiles = (Array.isArray(json.profiles) ? json.profiles : []) as ExploreProfile[];
        const list = profiles.map((p) => ({
          id: p.id as string,
          self_name: p.self_name ?? undefined,
          vitality: Number(p.vitality ?? 0),
          total_messages: Number(p.total_messages ?? 0),
          gen_level: Number(p.gen_level ?? 1),
          species: p.species ?? null,
          visual: p.visual ?? null,
          config: p.config ?? null,
        }));
        setAgents(list);
      } catch {
        setError(t("explore.loadError"));
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl space-y-4">
        <DiscoverPageHeader
          eyebrow={t("explore.eyebrow")}
          title={t("explore.title")}
          subtitle={t("explore.subtitle")}
        />
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const appearance = resolveIdentityAppearance(
            {
              seed: a.id,
              selfName: a.self_name,
              visual: a.visual,
              genome: { species: a.species },
              config: a.config ?? null,
              genLevel: a.gen_level,
              vitality: a.vitality,
            },
            locale
          );
          return (
            <div
              key={a.id}
              className="theme-panel rounded-[1.75rem] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
            >
              <div className="flex items-start gap-3">
                <IdentityPresence appearance={appearance} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {appearance.title}
                  </p>
                  <div className="mt-2 font-medium text-white">{a.self_name || t("explore.nameless")}</div>
                  <p className="mt-1 text-xs leading-5 text-white/55">{appearance.usageNarrative ?? appearance.subtitle}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Gen</p>
                  <p className="mt-1 text-sm font-medium text-white">{a.gen_level}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">{t("explore.memory")}</p>
                  <p className="mt-1 text-sm font-medium text-white">{a.total_messages}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">{t("chat.vitality")}</p>
                  <p className="mt-1 text-sm font-medium text-white">{(a.vitality * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {appearance.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      borderColor: `${appearance.palette.primary}30`,
                      background: `${appearance.palette.primary}12`,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <DiscussInChatButton
                  prompt={t("discover.discussThisPrompt")
                    .replace("{name}", a.self_name || t("explore.nameless"))
                    .replace("{page}", t("explore.title"))}
                  label={t("discover.discussInChat")}
                  variant="primary"
                />
                <Link
                  href="/compare"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78 hover:bg-white/10"
                >
                  {t("leaderboard.compareNow")}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {agents.length === 0 && (
        <AnimatedEmptyState
          icon="explore"
          title={t("explore.emptyTitle")}
          description={t("explore.emptyDesc")}
          accentColor="#38bdf8"
        />
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-center">
        <Link href="/adopt" className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90">
          {t("adoptPage.title")}
        </Link>
        <Link href="/social" className="inline-block rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10">
          {t("socialPage.title")}
        </Link>
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
