"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

const ConstellationScene = dynamic(() => import("@/components/constellation-scene"), { ssr: false });

type Star = { id: string; content: string; type: string; created_at?: string; x: number; y: number; z: number };
type Constellation = { name: string; starIds: string[] };

export default function ConstellationPage() {
  const { t } = useTranslations();
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/constellation")
      .then((r) => (r.ok ? r.json() : { stars: [], constellations: [] }))
      .then((d) => {
        setStars(d.stars ?? []);
        setConstellations(d.constellations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-semibold">{t("constellationPage.title")}</h1>
        <p className="text-white/50 text-sm mt-1">{t("constellationPage.subtitle")}</p>
      </div>
      <div className="flex-1 min-h-[50vh] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : (
          <ConstellationScene stars={stars} />
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
