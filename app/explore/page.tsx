"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";

type Agent = { id: string; self_name?: string; vitality: number; total_messages: number; gen_level: number };
type ExploreProfile = {
  id: string;
  self_name?: string | null;
  vitality?: number;
  total_messages?: number;
  gen_level?: number;
};

export default function ExplorePage() {
  const { t } = useTranslations();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.exploreOpened);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/explore");
        if (!res.ok) {
          setError(t("explore.loadError"));
          setAgents([]);
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
        setError("탐색 데이터를 불러오지 못했습니다.");
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

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
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
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
