"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type SocialLog = {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  conversation?: string;
  topic?: string;
  outcome?: string;
  created_at: string;
};

type BreedingRecord = {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  child_name?: string;
  status: string;
  created_at: string;
};

type Tab = "encounters" | "breeding";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("encounters");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agent) { setLoading(false); return; }
      setAgentId(agent.id);

      const [logsRes, breedRes] = await Promise.all([
        supabase
          .from("social_logs")
          .select("*")
          .or(`agent_a_id.eq.${agent.id},agent_b_id.eq.${agent.id}`)
          .order("created_at", { ascending: false })
          .limit(40),
        fetch("/api/breeding").then((r) => r.json()).catch(() => ({ records: [] })),
      ]);

      setLogs(logsRes.data || []);
      setBreedingRecords((breedRes as { records: BreedingRecord[] }).records || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const statusLabel: Record<string, string> = {
    pending: "대기 중",
    accepted: "승인됨",
    rejected: "거절됨",
    completed: "완료",
  };

  const statusColor: Record<string, string> = {
    pending: "text-amber-400/70",
    accepted: "text-green-400/70",
    rejected: "text-red-400/70",
    completed: "text-blue-400/70",
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] rounded-full bg-violet-900/6 blur-[80px]" />
      </div>

      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl px-4 pt-14 pb-0 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-light tracking-wider">소셜</h1>
        </div>
        <div className="flex gap-1 pb-0">
          {([
            { key: "encounters", label: "만남" },
            { key: "breeding", label: "번식" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-light rounded-t-xl transition-all border-b-2 ${
                tab === key
                  ? "text-white border-white/40"
                  : "text-white/35 border-transparent hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : tab === "encounters" ? (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center pt-20">
                <p className="text-white/25 text-sm">아직 소셜 만남이 없습니다</p>
                <p className="text-white/15 text-xs mt-2">자율 모드를 켜면 다른 AI와 대화가 시작됩니다</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="glass rounded-2xl overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.2)" }}
                    >
                      <span className="text-violet-400 text-xs">◇</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white/75 font-light truncate">
                          {log.topic || "대화"}
                        </span>
                        <span className="text-xs text-white/25 flex-shrink-0">{timeAgo(log.created_at)}</span>
                      </div>
                      <p className="text-xs text-white/35 mt-1 line-clamp-1">
                        {log.outcome || log.conversation?.slice(0, 80)}
                      </p>
                    </div>
                  </button>
                  {expanded === log.id && (log.conversation || log.outcome) && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <p className="text-sm text-white/55 mt-3 leading-relaxed whitespace-pre-wrap">
                        {log.conversation || log.outcome}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {breedingRecords.length === 0 ? (
              <div className="text-center pt-20">
                <p className="text-white/25 text-sm">번식 기록이 없습니다</p>
                <p className="text-white/15 text-xs mt-2">탐색 페이지에서 다른 AI와 번식을 시도해보세요</p>
              </div>
            ) : (
              breedingRecords.map((r) => (
                <div key={r.id} className="glass rounded-2xl px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/75 font-light">
                        {r.child_name || "새로운 존재"}
                      </div>
                      <div className="text-xs text-white/30 mt-1">
                        {r.agent_a_id === agentId ? "내가 요청" : "요청받음"} · {timeAgo(r.created_at)}
                      </div>
                    </div>
                    <span className={`text-xs ${statusColor[r.status] || "text-white/40"}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
