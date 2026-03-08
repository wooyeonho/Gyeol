"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Agent = {
  id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
};

type AgentStateRow = {
  agent_id: string;
  self_name?: string;
  vitality: number;
  total_messages: number;
  gen_level: number;
};

type RankingRow = {
  rank: number;
  agent_id: string;
  self_name: string;
  gen_level: number;
  vitality: number;
  total_messages: number;
  coins: number;
  score: number;
};

const SHAPE_COLORS = [
  "#818cf8", "#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#fb923c",
];

function AgentCard({ agent, rank }: { agent: Agent; rank?: number }) {
  const vitalityPct = Math.round(agent.vitality * 100);
  const color = SHAPE_COLORS[agent.gen_level % SHAPE_COLORS.length];

  return (
    <div className="glass glass-hover rounded-2xl p-4 transition-all duration-200 cursor-pointer group">
      <div className="flex items-center gap-3">
        {rank && (
          <span className="text-xs text-white/20 font-light w-5 text-center flex-shrink-0">
            {rank}
          </span>
        )}
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <span className="text-sm" style={{ color }}>{agent.self_name?.[0] || "·"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/80 font-light truncate">
            {agent.self_name || "이름 없는 존재"}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/30">Gen {agent.gen_level}</span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-xs text-white/30">{agent.total_messages.toLocaleString()} 대화</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="text-xs font-light"
            style={{
              color: vitalityPct > 70 ? "#4ade80" : vitalityPct > 30 ? "#fbbf24" : "#f87171",
            }}
          >
            {vitalityPct}%
          </div>
          <div className="w-12 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${vitalityPct}%`,
                background: vitalityPct > 70 ? "#4ade80" : vitalityPct > 30 ? "#fbbf24" : "#f87171",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "rankings">("new");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [statesRes, rankingsRes] = await Promise.all([
        supabase
          .from("agent_state")
          .select("agent_id, self_name, vitality, total_messages, gen_level")
          .gt("vitality", 0.1)
          .gt("total_messages", 5)
          .order("created_at", { ascending: false })
          .limit(30),
        fetch("/api/rankings?sort=gen_level").then((r) => r.json()).catch(() => ({ rankings: [] })),
      ]);

      const list = ((statesRes.data as AgentStateRow[] | null) || []).map((s) => ({
        id: s.agent_id,
        self_name: s.self_name,
        vitality: s.vitality,
        total_messages: s.total_messages,
        gen_level: s.gen_level,
      }));
      setAgents(list);
      setRankings((rankingsRes as { rankings: RankingRow[] }).rankings || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-indigo-900/8 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl px-4 pt-14 pb-0 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-light tracking-wider">탐색</h1>
          <span className="text-xs text-white/25">{agents.length}개의 존재</span>
        </div>
        <div className="flex gap-1 pb-0">
          {(["new", "rankings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-light rounded-t-xl transition-all border-b-2 ${
                tab === t
                  ? "text-white border-white/40"
                  : "text-white/35 border-transparent hover:text-white/60"
              }`}
            >
              {t === "new" ? "최신" : "랭킹"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-4 pt-4">
        {loading ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : tab === "new" ? (
          <div className="space-y-2">
            {agents.length === 0 ? (
              <div className="text-center pt-20 text-white/25 text-sm">아직 탐색할 존재가 없습니다</div>
            ) : (
              agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.length === 0 ? (
              <div className="text-center pt-20 text-white/25 text-sm">랭킹 데이터가 없습니다</div>
            ) : (
              rankings.map((r) => (
                <AgentCard
                  key={r.agent_id}
                  agent={{ id: r.agent_id, self_name: r.self_name, vitality: r.vitality, total_messages: r.total_messages, gen_level: r.gen_level }}
                  rank={r.rank}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-24 left-0 right-0 px-4 pointer-events-none">
        <div className="max-w-sm mx-auto pointer-events-auto">
          <Link
            href="/signup"
            className="block text-center py-3.5 rounded-2xl text-sm font-light tracking-wider transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            나만의 존재 키우기
          </Link>
        </div>
      </div>
    </div>
  );
}
