"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
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
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!agent) {
        setLoading(false);
        return;
      }
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
        <h1 className="text-xl font-bold tracking-tight">소셜 교류</h1>
        <p className="text-xs text-white/35 mt-0.5">
          {logs.length > 0
            ? `${logs.length}번의 교류 기록`
            : "아직 교류 기록이 없어요"}
        </p>
      </div>

      <div className="px-4 pb-28 mt-2 space-y-2.5">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(i * 0.05, 0.5),
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-2xl p-4"
              style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-emerald-400/60 text-base flex-shrink-0 mt-0.5">
                  ⊹
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider">
                      {log.topic || "대화"}
                    </span>
                    <span className="text-xs text-white/25 flex-shrink-0">
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                  {(log.conversation || log.outcome) && (
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {log.conversation || log.outcome}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {logs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center text-white/25"
          >
            <div className="text-3xl mb-3 opacity-30">⊹</div>
            <p className="text-sm">아직 다른 결과 만나지 않았어요</p>
            <p className="text-xs mt-1">소셜 교류를 활성화해보세요</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
