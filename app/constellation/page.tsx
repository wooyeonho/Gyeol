"use client";

import { useEffect, useState } from "react";
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
      <div className="p-4 space-y-2">
        {constellations.map((c) => (
          <div key={c.name} className="text-sm text-white/70">
            <span className="font-medium text-white/90">{c.name}</span>
            <span className="ml-2">{c.starIds.length} {t("constellationPage.stars")}</span>
          </div>
        ))}
      </div>
      <div className="p-4 pb-24">
        <Link href="/" className="text-white/50 text-sm hover:text-white/80">{t("constellationPage.backHome")}</Link>
      </div>
    </div>
  );
}
