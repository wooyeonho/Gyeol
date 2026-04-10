"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";
import { useTranslations } from "@/components/i18n-provider";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { PageSkeleton } from "@/components/discover/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { ShareCard } from "@/components/share-card";
import { CreatureStatusBar } from "@/components/creature-status-bar";

const RoomScene = dynamic(() => import("@/components/room-scene"), { ssr: false });
const RoomEditor = dynamic(() => import("@/components/room-editor").then(m => ({ default: m.RoomEditor })), { ssr: false });

export default function RoomPage() {
  const { locale, t } = useTranslations();
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [arColor, setArColor] = useState("#a0a0ff");
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [config, setConfig] = useState<{ usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null>(null);
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [vitality, setVitality] = useState(1);

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

    // Fetch agent state for ShareCard & CreatureStatusBar
    fetch("/api/agent/state")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { agentId?: string; agentState?: { vitality?: number; self_name?: string } }) => {
        if (d.agentId) setAgentId(d.agentId);
        if (d.agentState?.vitality != null) setVitality(d.agentState.vitality);
        if (d.agentState?.self_name) setAgentName(d.agentState.self_name);
      })
      .catch(() => {});
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
          {agentId && (
            <div className="mt-3 flex justify-end">
              <ShareCard agentId={agentId} creatureName={agentName || "GYEOL"} locale={locale} />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 relative min-h-[60vh]">
        {/* Creature status overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
          <CreatureStatusBar
            energy={Math.round(vitality * 100)}
            happiness={Math.round(Math.min(100, vitality * 80 + 20))}
            hunger={Math.round(Math.min(100, vitality * 90 + 10))}
            locale={locale}
            compact
          />
        </div>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl skeleton-shimmer" />
              <div className="h-3 w-24 rounded skeleton-shimmer" />
            </div>
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
        <h2 className="text-sm font-medium text-white/70 mb-3">{t("roomPage.customize") || "방 꾸미기"}</h2>
        <RoomEditor locale={locale} />
      </section>
      <section className="p-4 border-t border-white/10">
        <h2 className="text-sm font-medium text-white/70 mb-2">{t("roomPage.viewInAr")}</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </section>
      <BottomNav />
    </div>
  );
}
