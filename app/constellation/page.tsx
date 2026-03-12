"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

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
            title: locale === "en" ? "Origin memory" : "기원 기억",
            body: firstStar.content,
            at: firstStar.created_at ?? null,
          }
        : null,
      constellations[0]
        ? {
            id: "pattern",
            title: constellations[0].name,
            body: locale === "en" ? "A recognizable memory pattern emerged." : "기억이 하나의 패턴으로 묶이기 시작했습니다.",
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
  }, [appearance, constellations, locale, stars]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="border-b border-white/10 p-4">
        <div className="mx-auto flex max-w-5xl items-start gap-4">
          <IdentityPresence appearance={appearance} size="md" />
          <div>
            <h1 className="text-xl font-semibold">{t("constellationPage.title")}</h1>
            <p className="mt-1 text-sm text-white/50">{t("constellationPage.subtitle")}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">{appearance.title}</p>
            {appearance.usageNarrative && (
              <p className="mt-2 text-xs leading-5 text-white/56">{appearance.usageNarrative}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[50vh] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : (
          <ConstellationScene
            stars={stars}
            color={appearance.palette.primary}
            backgroundColor={appearance.palette.background}
            emptyLabel={locale === "en" ? "No stars yet. Memories will become a sky here." : "아직 별이 없습니다. 기억이 쌓이면 이곳이 하나의 하늘이 됩니다."}
          />
        )}
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-2 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {locale === "en" ? "constellation clusters" : "별자리 묶음"}
          </p>
          {constellations.map((c) => (
            <div key={c.name} className="text-sm text-white/70">
              <span className="font-medium text-white/90">{c.name}</span>
              <span className="ml-2">{c.starIds.length} {t("constellationPage.stars")}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {locale === "en" ? "identity evolution timeline" : "정체성 evolution timeline"}
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
                    {new Date(item.at).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-white/66">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 pb-24">
        <Link href="/" className="text-white/50 text-sm hover:text-white/80">{t("constellationPage.backHome")}</Link>
      </div>
    </div>
  );
}
