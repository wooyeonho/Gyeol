"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildFallbackExplore } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

type Agent = { id: string; self_name?: string; vitality: number; total_messages: number; gen_level: number };
type ExploreProfile = {
  id: string;
  self_name?: string | null;
  vitality?: number;
  total_messages?: number;
  gen_level?: number;
};

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
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

  const fallbackAgents = useMemo(
    () =>
      buildFallbackExplore({
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
    async function load() {
      try {
        const res = await fetch("/api/explore");
        if (!res.ok) {
          setDemoMode(true);
          setAgents(
            fallbackAgents.map((p) => ({
              id: p.id,
              self_name: p.self_name ?? undefined,
              vitality: Number(p.vitality ?? 0),
              total_messages: Number(p.total_messages ?? 0),
              gen_level: Number(p.gen_level ?? 1),
            })),
          );
          return;
        }
        const json = await res.json().catch(() => ({ profiles: [] }));
        const profiles = (Array.isArray(json.profiles) ? json.profiles : []) as ExploreProfile[];
        const list = profiles.map((p) => ({
          id: p.id as string,
          self_name: p.self_name ?? undefined,
          vitality: Number(p.vitality ?? 0),
          total_messages: Number(p.total_messages ?? 0),
          gen_level: Number(p.gen_level ?? 1),
        }));
        setAgents(list);
      } catch {
        setDemoMode(true);
        setAgents(
          fallbackAgents.map((p) => ({
            id: p.id,
            self_name: p.self_name ?? undefined,
            vitality: Number(p.vitality ?? 0),
            total_messages: Number(p.total_messages ?? 0),
            gen_level: Number(p.gen_level ?? 1),
          })),
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [fallbackAgents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-4">
      <h1 className="text-xl font-semibold mb-4">탐색</h1>
      {demoMode && hasHydrated && (
        <div className="mb-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-sm text-white/80">
          실데이터 연결 전이라 Relationship OS 기반 탐험 미리보기를 보여주고 있습니다.
        </div>
      )}
      <div className="space-y-3">
        {agents.map((a) => (
          <div key={a.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="font-medium">{a.self_name || "이름 없음"}</div>
            <div className="text-sm text-white/60">Gen {a.gen_level} · {a.total_messages} 메시지 · 활력 {(a.vitality * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/signup" className="inline-block px-6 py-3 rounded-xl bg-white/20">
          나도 키워보기
        </Link>
      </div>
    </div>
  );
}
