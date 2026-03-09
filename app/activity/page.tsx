"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { motion } from "framer-motion";

type Log = { action_type: string; summary?: string; created_at: string };
type Artifact = { id: string; type: string; content?: string; title?: string; is_preserved?: boolean; created_at: string };

const TYPE_META: Record<string, { color: string; bg: string; icon: string }> = {
  heartbeat: { color: "text-white/60", bg: "bg-white/5", icon: "♡" },
  evolution: { color: "text-amber-400", bg: "bg-amber-500/10", icon: "↑" },
  dream: { color: "text-purple-400", bg: "bg-purple-500/10", icon: "☽" },
  artifact_creation: { color: "text-blue-400", bg: "bg-blue-500/10", icon: "◆" },
  social_encounter: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: "◎" },
  scar: { color: "text-red-400", bg: "bg-red-500/10", icon: "✕" },
  self_naming: { color: "text-amber-300", bg: "bg-amber-400/10", icon: "✦" },
};

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  if (hrs < 24) return `${hrs}시간 전`;
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<(Log & { kind: "log" })[]>([]);
  const [artifacts, setArtifacts] = useState<(Artifact & { kind: "artifact" })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: agents } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agents) { setLoading(false); return; }

      const agentId = agents.id;
      const { data: logData } = await supabase.from("autonomous_logs").select("action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30);
      const { data: artData } = await supabase.from("artifacts").select("id, type, content, title, is_preserved, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30);

      setLogs(((logData as Log[] | null) || []).map((l: Log) => ({ ...l, kind: "log" as const })));
      setArtifacts(((artData as Artifact[] | null) || []).map((a: Artifact) => ({ ...a, kind: "artifact" as const })));
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function togglePreserved(id: string, current: boolean) {
    await supabase.from("artifacts").update({ is_preserved: !current }).eq("id", id);
    setArtifacts((prev) => prev.map((a) => (a.id === id ? { ...a, is_preserved: !current } : a)));
  }

  const combined = [
    ...logs.map((l) => ({ ...l, kind: "log" as const, created_at: l.created_at })),
    ...artifacts.map((a) => ({ ...a, kind: "artifact" as const, created_at: a.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);

  if (loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" style={{ animation: "dot-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-white pb-28 px-4">
      <div className="max-w-lg mx-auto pt-16">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">활동</h1>
          <p className="text-sm text-white/40 mt-1">자율 활동 기록과 창작물</p>
        </motion.div>

        {combined.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-white/20">◇</span>
            </div>
            <p className="text-white/30 text-sm">아직 기록된 활동이 없어요</p>
          </motion.div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />
            <div className="space-y-3">
              {combined.map((item, i) => {
                const typeKey = item.kind === "log" ? (item as Log).action_type : (item as Artifact).type;
                const meta = TYPE_META[typeKey] || { color: "text-white/50", bg: "bg-white/5", icon: "·" };

                return (
                  <motion.div
                    key={item.kind + "-" + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
                    className="relative pl-12"
                  >
                    <div className={`absolute left-3 top-4 w-4 h-4 rounded-full ${meta.bg} flex items-center justify-center`}>
                      <span className={`text-[10px] ${meta.color}`}>{meta.icon}</span>
                    </div>

                    <div className="glass rounded-xl p-4 glass-hover transition-all duration-200">
                      {item.kind === "log" ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${meta.color}`}>{item.action_type}</span>
                            <span className="text-[10px] text-white/20">{formatTime(item.created_at)}</span>
                          </div>
                          <div className="text-sm text-white/70 leading-relaxed">{item.summary}</div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${meta.color}`}>{(item as Artifact).type}</span>
                              <span className="text-[10px] text-white/20">{formatTime(item.created_at)}</span>
                            </div>
                            <button
                              onClick={() => togglePreserved((item as Artifact).id, (item as Artifact).is_preserved || false)}
                              className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-200 ${
                                (item as Artifact).is_preserved
                                  ? "bg-accent/20 text-accent-light"
                                  : "bg-white/5 text-white/30 hover:bg-white/10"
                              }`}
                            >
                              {(item as Artifact).is_preserved ? "보관됨" : "보관"}
                            </button>
                          </div>
                          <div className="text-sm text-white/70 leading-relaxed">
                            {(item as Artifact).title || (item as Artifact).content?.slice(0, 100)}
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
