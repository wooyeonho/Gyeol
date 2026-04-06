"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { formatLocalizedDate } from "@/lib/i18n/format";
import { BottomNav } from "@/components/bottom-nav";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { PageSkeleton } from "@/components/discover/skeleton";

const ConstellationScene = dynamic(() => import("@/components/constellation-scene"), { ssr: false });

type Star = { id: string; content: string; type: string; created_at?: string; x: number; y: number; z: number };
type Constellation = { name: string; starIds: string[] };
type ConstellationAgent = {
  self_name?: string | null;
  visual?: { color?: string; shape?: string } | null;
  genome?: { species?: string | null; mutations?: string[] | null } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
  gen_level?: number | null;
  vitality?: number | null;
  mood?: string | null;
};

export default function ConstellationPage() {
  const { locale, t } = useTranslations();
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [selfAgent, setSelfAgent] = useState<ConstellationAgent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/constellation")
      .then((r) => (r.ok ? r.json() : { stars: [], constellations: [] }))
      .then((d) => {
        setStars(d.stars ?? []);
        setConstellations(d.constellations ?? []);
        setSelfAgent((d.selfAgent as ConstellationAgent | null) ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const appearance = resolveIdentityAppearance(
    {
      selfName: selfAgent?.self_name,
      visual: selfAgent?.visual,
      genome: selfAgent?.genome,
      config: selfAgent?.config,
      selfModel: selfAgent?.self_model,
      genLevel: selfAgent?.gen_level ?? 1,
      vitality: selfAgent?.vitality ?? 1,
      mood: selfAgent?.mood ?? null,
    },
    locale
  );
  const evolutionTimeline = useMemo(() => {
    const firstStar = stars[0];
    const lastStar = stars[stars.length - 1];
    const stages = [
      firstStar
        ? {
            id: "origin",
            title: t("constellationPage.originMemory"),
            body: firstStar.content,
            at: firstStar.created_at ?? null,
          }
        : null,
      constellations[0]
        ? {
            id: "pattern",
            title: constellations[0].name,
            body: t("constellationPage.patternBody"),
            at: firstStar?.created_at ?? null,
          }
        : null,
      lastStar
        ? {
            id: "current",
            title: appearance.title,
            body: appearance.usageNarrative ?? appearance.subtitle,
            at: lastStar.created_at ?? null,
          }
        : null,
    ].filter(Boolean) as Array<{ id: string; title: string; body: string; at: string | null }>;
    return stages;
  }, [appearance, constellations, stars, t]);

  return (
    <div className="theme-page min-h-screen pb-24 flex flex-col">
      <div className="px-4 pt-20 pb-4">
        <div className="mx-auto max-w-5xl">
          <DiscoverPageHeader
            eyebrow={appearance.title}
            title={t("constellationPage.title")}
            subtitle={appearance.usageNarrative ?? t("constellationPage.subtitle")}
            appearance={appearance}
            tight
          />
        </div>
      </div>
      <div className="flex-1 min-h-[50vh] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full skeleton-shimmer" />
              <div className="h-3 w-24 rounded skeleton-shimmer" />
            </div>
          </div>
        ) : (
          <ConstellationScene
            stars={stars}
            color={appearance.palette.primary}
            backgroundColor={appearance.palette.background}
            emptyLabel={t("constellationPage.emptySky")}
          />
        )}
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="theme-panel space-y-2 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("constellationPage.clusters")}
          </p>
          {constellations.map((c) => (
            <div key={c.name} className="text-sm text-white/70">
              <span className="font-medium text-white/90">{c.name}</span>
              <span className="ml-2">{c.starIds.length} {t("constellationPage.stars")}</span>
            </div>
          ))}
        </div>
        <div className="theme-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {t("constellationPage.timelineEyebrow")}
          </p>
          <div className="mt-4 space-y-4">
            {evolutionTimeline.map((item, index) => (
              <div key={item.id} className="relative pl-8">
                {index < evolutionTimeline.length - 1 && (
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
                {item.at && (
                  <p className="mt-1 text-xs text-white/48">
                    {formatLocalizedDate(item.at, locale)}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-white/66">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
