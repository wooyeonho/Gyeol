"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { buildFallbackConstellation } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

const ConstellationScene = dynamic(() => import("@/components/constellation-scene"), { ssr: false });

type Star = { id: string; content: string; type: string; created_at?: string; x: number; y: number; z: number };
type Constellation = { name: string; starIds: string[] };

export default function ConstellationPage() {
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [loading, setLoading] = useState(true);
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
      buildFallbackConstellation({
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
    fetch("/api/constellation")
      .then((r) => {
        if (!r.ok) {
          setDemoMode(true);
          return fallback;
        }
        return r.json();
      })
      .then((d) => {
        setStars(d.stars ?? []);
        setConstellations(d.constellations ?? []);
      })
      .catch(() => {
        setDemoMode(true);
        setStars(fallback.stars);
        setConstellations(fallback.constellations);
      })
      .finally(() => setLoading(false));
  }, [fallback]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-semibold">Constellation</h1>
        <p className="text-white/50 text-sm mt-1">Each memory is a star. Clusters form constellations.</p>
        {demoMode && hasHydrated && (
          <p className="text-cyan-200/75 text-xs mt-2">실메모리 대신 현재 캡처와 스토리를 별자리로 변환했습니다.</p>
        )}
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
            <span className="ml-2">{c.starIds.length} stars</span>
          </div>
        ))}
      </div>
      <div className="p-4 pb-24">
        <Link href="/" className="text-white/50 text-sm hover:text-white/80">Back to home</Link>
      </div>
      <BottomNav />
    </div>
  );
}
