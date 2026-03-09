"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";

type Agent = { id: string; self_name?: string; vitality: number; total_messages: number; gen_level: number };
type AgentStateRow = { agent_id: string; self_name?: string; vitality: number; total_messages: number; gen_level: number };

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: states } = await supabase.from("agent_state").select("agent_id, self_name, vitality, total_messages, gen_level").gt("vitality", 0.1).gt("total_messages", 10);
      const list = ((states as AgentStateRow[] | null) || []).map((s: AgentStateRow) => ({
        id: s.agent_id,
        self_name: s.self_name,
        vitality: s.vitality,
        total_messages: s.total_messages,
        gen_level: s.gen_level,
      }));
      setAgents(list);
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
    <div className="min-h-dvh bg-black text-white pb-12 px-4">
      <div className="max-w-lg mx-auto pt-16">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">탐색</h1>
          <p className="text-sm text-white/40 mt-1">살아있는 AI 생명체들을 만나보세요</p>
        </motion.div>

        {agents.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-white/20">🌌</span>
            </div>
            <p className="text-white/30 text-sm">아직 활동 중인 생명체가 없어요</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {agents.map((a, i) => {
              const vColor = a.vitality > 0.7 ? "text-emerald-400" : a.vitality > 0.3 ? "text-amber-400" : "text-red-400";
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="glass rounded-xl p-4 glass-hover transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white/80">{(a.self_name || "?")[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">{a.self_name || "이름 없음"}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-accent-light font-medium">Gen {a.gen_level}</span>
                        <span className="text-white/15">·</span>
                        <span className="text-[10px] text-white/40">{a.total_messages} 대화</span>
                        <span className="text-white/15">·</span>
                        <span className={`text-[10px] font-medium ${vColor}`}>{(a.vitality * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center"
        >
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-xl gradient-accent text-white text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-accent/20"
          >
            나도 키워보기
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
