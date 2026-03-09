"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { RoomObject } from "@/lib/room/types";
import ARViewer from "@/components/ar-viewer";
import { BottomNav } from "@/components/bottom-nav";
import { buildFallbackRoom } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

const RoomScene = dynamic(() => import("@/components/room-scene"), { ssr: false });

export default function RoomPage() {
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [arColor, setArColor] = useState("#a0a0ff");
  const [demoMode, setDemoMode] = useState(false);
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const quests = useRelationshipOsStore((state) => state.quests);
  const autonomousMode = useRelationshipOsStore((state) => state.autonomousMode);
  const fallback = useMemo(
    () =>
      buildFallbackRoom({
        profiles,
        promises,
        approvals,
        captures,
        stories,
        quests,
        autonomousMode,
      }),
    [approvals, autonomousMode, captures, profiles, promises, quests, stories],
  );

  useEffect(() => {
    fetch("/api/room")
      .then((r) => {
        if (!r.ok) {
          setDemoMode(true);
          return { objects: fallback.objects, visual: { color: fallback.color } };
        }
        return r.json();
      })
      .then((d) => {
        setObjects(Array.isArray(d.objects) ? d.objects : []);
        if (d.visual?.color) setArColor(d.visual.color);
      })
      .catch(() => {
        setDemoMode(true);
        setObjects(fallback.objects);
        setArColor(fallback.color);
      })
      .finally(() => setLoading(false));
  }, [fallback]);

  const saveARPosition = (position: [number, number, number]) => {
    fetch("/api/room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ar_position: position }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-semibold">Room</h1>
        <p className="text-white/50 text-sm mt-1">Each memory becomes an object in the space.</p>
        {demoMode && hasHydrated && (
          <p className="text-cyan-200/75 text-xs mt-2">실메모리 대신 현재 관계 스냅샷을 공간 오브젝트로 변환해 보여주고 있습니다.</p>
        )}
      </div>
      <div className="flex-1 relative min-h-[60vh]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : (
          <RoomScene objects={objects} />
        )}
      </div>
      <section className="p-4 border-t border-white/10 pb-24">
        <h2 className="text-sm font-medium text-white/70 mb-2">View in AR</h2>
        <ARViewer color={arColor} onPositionSave={saveARPosition} />
      </section>
      <BottomNav />
    </div>
  );
}
