"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { BottomNav } from "@/components/bottom-nav";

const RoomScene = dynamic(() => import("@/components/room-scene"), { ssr: false });

export default function RoomPage() {
  const { locale, t } = useTranslations();
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [arColor, setArColor] = useState("#a0a0ff");
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [config, setConfig] = useState<{ usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null>(null);

  useEffect(() => {
    fetch("/api/room")
      .then((r) => (r.ok ? r.json() : { objects: [] }))
      .then((d) => {
        setObjects(Array.isArray(d.objects) ? d.objects : []);
        if (d.visual?.color) setArColor(d.visual.color);
        setVisual(d.visual ?? null);
        setConfig(d.config ?? null);
      })
      .catch(() => setObjects([]))
      .finally(() => setLoading(false));
  }, []);

  const saveARPosition = (position: [number, number, number]) => {
    fetch("/api/room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ar_position: position }),
    }).catch(() => {});
  };

  const appearance = resolveIdentityAppearance({ visual, config }, locale);

  return (
    <div className="theme-page min-h-screen pb-24 text-white flex flex-col">
      <div className="px-4 pt-20 pb-4">
        <div className="mx-auto max-w-5xl">
          <DiscoverPageHeader
            eyebrow={appearance.title}
            title={t("roomPage.title")}
            subtitle={appearance.usageNarrative ?? t("roomPage.subtitle")}
            appearance={appearance}
            tight
          />
        </div>
      </div>
      <div className="flex-1 relative min-h-[60vh]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : (
          <RoomScene
            objects={objects}
            accentColor={appearance.palette.primary}
            backgroundColor={appearance.palette.background}
            emptyLabel={t("roomPage.empty")}
          />
        )}
      </div>
      <section className="p-4 border-t border-white/10">
        <h2 className="text-sm font-medium text-white/70 mb-2">{t("roomPage.viewInAr")}</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </section>
      <BottomNav />
    </div>
  );
}
