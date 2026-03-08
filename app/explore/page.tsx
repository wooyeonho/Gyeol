"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Agent = { id: string; self_name?: string; vitality: number; total_messages: number; gen_level: number };

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: states } = await supabase.from("agent_state").select("agent_id, self_name, vitality, total_messages, gen_level").gt("vitality", 0.1).gt("total_messages", 10);
      const list = (states || []).map((s) => ({ id: s.agent_id, self_name: s.self_name, vitality: s.vitality, total_messages: s.total_messages, gen_level: s.gen_level }));
      setAgents(list);
      setLoading(false);
    }
    load();
  }, [supabase]);

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
