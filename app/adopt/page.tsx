"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { buildFallbackAdopt } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

type BoardItem = {
  agent_id: string;
  self_name?: string | null;
  vitality?: number;
  memory_count?: number;
  days_alive?: number;
};

export default function AdoptPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const addCapture = useRelationshipOsStore((state) => state.addCapture);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const quests = useRelationshipOsStore((state) => state.quests);
  const autonomousMode = useRelationshipOsStore((state) => state.autonomousMode);
  const fallbackItems = useMemo(
    () =>
      buildFallbackAdopt({
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
        const res = await fetch("/api/adopt");
        const json = await res.json().catch(() => ({ list: [] }));
        if (!res.ok) {
          setDemoMode(true);
          setItems(fallbackItems);
          return;
        }
        setItems(Array.isArray(json.list) ? json.list : []);
      } catch {
        setDemoMode(true);
        setItems(fallbackItems);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fallbackItems]);

  async function adopt(agentId: string) {
    try {
      setSubmittingId(agentId);
      setError(null);
      if (demoMode) {
        const item = items.find((entry) => entry.agent_id === agentId);
        if (item) {
          addCapture(`${item.self_name ?? "존재"}를 입양 후보로 연결하기`, "quick_note");
        }
        setItems((prev) => prev.filter((i) => i.agent_id !== agentId));
        return;
      }
      const res = await fetch("/api/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "입양에 실패했습니다.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.agent_id !== agentId));
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">입양</h1>
      {demoMode && hasHydrated && (
        <div className="mb-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-sm text-white/80">
          실입양 보드 연결 전이라 자동진화 스냅샷 기반 후보를 보여주고 있습니다.
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.agent_id} className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-between items-center">
            <div>
              <div className="text-sm text-white/60">{item.self_name || "이름 없는 존재"}</div>
              <div className="text-white/80 text-sm">
                활력 {Math.round((item.vitality ?? 0) * 100)}% · 기억 {item.memory_count ?? 0}개 · {item.days_alive ?? 0}일
              </div>
            </div>
            <button
              onClick={() => void adopt(item.agent_id)}
              disabled={submittingId === item.agent_id}
              className="px-4 py-2 rounded-lg bg-white/20 disabled:opacity-50"
            >
              입양하기
            </button>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
