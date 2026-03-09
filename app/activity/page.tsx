"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type Log = { action_type: string; summary?: string; created_at: string };
type Artifact = {
  id: string;
  type: string;
  content?: string;
  title?: string;
  is_preserved?: boolean;
  created_at: string;
};

const TYPE_CONFIG: Record<
  string,
  { gradient: string; border: string; icon: string; label: string }
> = {
  heartbeat: {
    gradient: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.07)",
    icon: "♡",
    label: "하트비트",
  },
  evolution: {
    gradient: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.25)",
    icon: "✦",
    label: "진화",
  },
  dream: {
    gradient: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.25)",
    icon: "◎",
    label: "꿈",
  },
  artifact_creation: {
    gradient: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    icon: "⬡",
    label: "창작물",
  },
  social_encounter: {
    gradient: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    icon: "⊹",
    label: "소셜",
  },
  scar: {
    gradient: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    icon: "✕",
    label: "상처",
  },
  self_naming: {
    gradient: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    icon: "◈",
    label: "자기명명",
  },
  poem: {
    gradient: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.25)",
    icon: "✿",
    label: "시",
  },
  image: {
    gradient: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.25)",
    icon: "▣",
    label: "그림",
  },
  music: {
    gradient: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.25)",
    icon: "♪",
    label: "음악",
  },
};

const DEFAULT_CONFIG = {
  gradient: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  icon: "·",
  label: "활동",
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_CONFIG;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<(Log & { kind: "log" })[]>([]);
  const [artifacts, setArtifacts] = useState<(Artifact & { kind: "artifact" })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: agents } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!agents) {
        setLoading(false);
        return;
      }
      const agentId = agents.id;
      const { data: logData } = await supabase
        .from("autonomous_logs")
        .select("action_type, summary, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(30);
      const { data: artData } = await supabase
        .from("artifacts")
        .select("id, type, content, title, is_preserved, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(30);

      setLogs(
        ((logData as Log[] | null) || []).map((l: Log) => ({
          ...l,
          kind: "log" as const,
        }))
      );
      setArtifacts(
        ((artData as Artifact[] | null) || []).map((a: Artifact) => ({
          ...a,
          kind: "artifact" as const,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function togglePreserved(id: string, current: boolean) {
    await supabase
      .from("artifacts")
      .update({ is_preserved: !current })
      .eq("id", id);
    setArtifacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_preserved: !current } : a))
    );
  }

  const combined = [
    ...logs.map((l) => ({ ...l, kind: "log" as const, created_at: l.created_at })),
    ...artifacts.map((a) => ({
      ...a,
      kind: "artifact" as const,
      created_at: a.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 50);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-violet-400"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.95) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <h1 className="text-xl font-bold tracking-tight">활동 로그</h1>
        <p className="text-xs text-white/35 mt-0.5">
          {combined.length > 0
            ? `최근 ${combined.length}개의 활동`
            : "아직 활동이 없어요"}
        </p>
      </div>

      <div className="px-4 pb-28 space-y-2.5 mt-2">
        <AnimatePresence>
          {combined.map((item, i) => {
            const typeKey =
              item.kind === "log"
                ? (item as Log).action_type
                : (item as Artifact).type;
            const cfg = getConfig(typeKey);

            return (
              <motion.div
                key={item.kind + "-" + i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(i * 0.04, 0.5),
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-2xl p-4"
                style={{
                  background: cfg.gradient,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {item.kind === "log" ? (
                  <div className="flex items-start gap-3">
                    <span
                      className="text-base mt-0.5 flex-shrink-0 w-6 text-center"
                      style={{ opacity: 0.7 }}
                    >
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          {cfg.label}
                        </span>
                        <span className="text-xs text-white/25 flex-shrink-0">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span
                      className="text-base mt-0.5 flex-shrink-0 w-6 text-center"
                      style={{ opacity: 0.7 }}
                    >
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-white/25">
                            {timeAgo(item.created_at)}
                          </span>
                          <button
                            onClick={() =>
                              togglePreserved(
                                (item as Artifact).id,
                                (item as Artifact).is_preserved || false
                              )
                            }
                            className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                            style={{
                              background: (item as Artifact).is_preserved
                                ? "rgba(124,58,237,0.3)"
                                : "rgba(255,255,255,0.07)",
                              border: (item as Artifact).is_preserved
                                ? "1px solid rgba(124,58,237,0.5)"
                                : "1px solid rgba(255,255,255,0.1)",
                              color: (item as Artifact).is_preserved
                                ? "#c4b5fd"
                                : "rgba(255,255,255,0.4)",
                            }}
                          >
                            {(item as Artifact).is_preserved ? "보관됨" : "보관"}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
                        {(item as Artifact).title ||
                          (item as Artifact).content?.slice(0, 120)}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {combined.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center text-white/25"
          >
            <div className="text-3xl mb-3 opacity-30">◎</div>
            <p className="text-sm">아직 활동 기록이 없어요</p>
            <p className="text-xs mt-1">대화를 나눠보세요</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
