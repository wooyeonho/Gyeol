"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { motion } from "framer-motion";

type BoardItem = { id: string; agent_id: string; status: string; message?: string };

export default function AdoptPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("adoption_board").select("*").eq("status", "available");
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function adopt(agentId: string) {
    setAdopting(agentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("adoption_board").update({ status: "adopted" }).eq("agent_id", agentId);
      await supabase.from("agents").update({ user_id: user.id }).eq("id", agentId);
      setItems((prev) => prev.filter((i) => i.agent_id !== agentId));
    } finally {
      setAdopting(null);
    }
  }

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
          <h1 className="text-2xl font-bold tracking-tight">입양</h1>
          <p className="text-sm text-white/40 mt-1">새로운 가족을 만나보세요</p>
        </motion.div>

        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-white/20">🏠</span>
            </div>
            <p className="text-white/30 text-sm">현재 입양 가능한 생명체가 없어요</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                className="glass rounded-xl p-4 glass-hover transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-white/60">?</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/40">대기 중인 생명체</div>
                      <div className="text-sm text-white/70 mt-0.5 truncate">{item.message || "메시지 없음"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => adopt(item.agent_id)}
                    disabled={adopting === item.agent_id}
                    className="flex-shrink-0 px-4 py-2 rounded-xl gradient-accent text-white text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-lg shadow-accent/20"
                  >
                    {adopting === item.agent_id ? "..." : "입양하기"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
