"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

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
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="border-b border-white/10 p-4">
        <div className="mx-auto flex max-w-4xl items-start gap-4">
          <IdentityPresence appearance={appearance} size="md" />
          <div>
            <h1 className="text-xl font-semibold">{t("roomPage.title")}</h1>
            <p className="mt-1 text-sm text-white/50">{t("roomPage.subtitle")}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">{appearance.title}</p>
            {appearance.usageNarrative && (
              <p className="mt-2 text-xs leading-5 text-white/56">{appearance.usageNarrative}</p>
            )}
          </div>
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
            emptyLabel={locale === "en" ? "No objects yet. This room will fill as the being keeps living." : "아직 오브젝트가 없습니다. 결이 계속 살아가며 이 방을 채우게 됩니다."}
          />
        )}
      </div>
      <section className="p-4 border-t border-white/10 pb-24">
        <h2 className="text-sm font-medium text-white/70 mb-2">{t("roomPage.viewInAr")}</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </section>
    </div>
  );
}
