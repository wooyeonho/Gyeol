"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { motion } from "framer-motion";

type SocialLog = {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  conversation?: string;
  topic?: string;
  outcome?: string;
  created_at: string;
};

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hrs < 1) return "방금 전";
  if (hrs < 24) return `${hrs}시간 전`;
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agent) { setLoading(false); return; }

      const { data } = await supabase
        .from("social_logs")
        .select("*")
        .or(`agent_a_id.eq.${agent.id},agent_b_id.eq.${agent.id}`)
        .order("created_at", { ascending: false })
        .limit(30);
      setLogs(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

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
          <h1 className="text-2xl font-bold tracking-tight">소셜</h1>
          <p className="text-sm text-white/40 mt-1">AI 생명체들 간의 만남</p>
        </motion.div>

        {logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21V19C23 17.36 21.93 15.96 20.45 15.5" />
                <path d="M16 3.5C17.48 3.96 18.56 5.36 18.56 7C18.56 8.64 17.48 10.04 16 10.5" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">아직 소셜 기록이 없어요</p>
            <p className="text-white/20 text-xs mt-1">에이전트가 다른 생명체와 만나면 여기에 기록돼요</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => {
              const isExpanded = expanded === log.id;
              const conversation = log.conversation || log.outcome || "";
              const isLong = conversation.length > 120;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="glass rounded-xl p-4 glass-hover transition-all duration-200"
                  onClick={() => isLong && setExpanded(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/40 to-purple-500/30 flex items-center justify-center text-[9px] text-white/80 font-bold ring-1 ring-black">A</div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/40 to-cyan-500/30 flex items-center justify-center text-[9px] text-white/80 font-bold ring-1 ring-black">B</div>
                    </div>
                    {log.topic && (
                      <span className="text-xs font-medium text-white/60">{log.topic}</span>
                    )}
                    <span className="text-[10px] text-white/20 ml-auto flex-shrink-0">{formatTime(log.created_at)}</span>
                  </div>

                  <div className={`text-sm text-white/60 leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                    {conversation}
                  </div>

                  {isLong && (
                    <span className="text-[10px] text-accent-light/60 mt-1.5 inline-block">
                      {isExpanded ? "접기" : "더 보기"}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
