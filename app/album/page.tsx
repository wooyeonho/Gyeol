"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { buildFallbackAlbum } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

type Milestone = { type: string; label: string; at: string; summary?: string };

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
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
      buildFallbackAlbum({
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
    fetch("/api/album")
      .then((r) => {
        if (!r.ok) {
          setDemoMode(true);
          return fallback;
        }
        return r.json();
      })
      .then((d) => {
        setMilestones(d.milestones ?? []);
        setVisual(d.visual ?? null);
      })
      .catch(() => {
        setDemoMode(true);
        setMilestones(fallback.milestones);
        setVisual(fallback.visual);
      })
      .finally(() => setLoading(false));
  }, [fallback]);

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold mb-2">Growth album</h1>
        <p className="text-white/50 text-sm mb-6">Major life events of your Gyeol.</p>
        {demoMode && hasHydrated && (
          <div className="mb-4 rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-4 py-3 text-sm text-white/80">
            실마일스톤 대신 현재 약속/스토리/승인 흐름으로 성장 앨범을 구성했습니다.
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-6 text-center text-white/50 text-sm">
            No milestones yet. Keep talking to build the album.
          </div>
        ) : (
          <ul className="space-y-4">
            {milestones.map((m, i) => (
              <li
                key={`${m.type}-${m.at}`}
                className="flex gap-4 items-start rounded-xl bg-white/5 p-4 border border-white/10"
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium"
                  style={{ background: visual?.color ? `${visual.color}33` : "rgba(255,255,255,0.1)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{m.label}</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {new Date(m.at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  {m.summary && <p className="text-white/70 text-sm mt-2 truncate">{m.summary}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            Home
          </Link>
          <Link
            href="/activity"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            Activity
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
