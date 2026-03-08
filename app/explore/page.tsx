"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">탐색</h1>
      {agents.length === 0 ? (
        <div className="py-12 text-center text-white/50 text-sm rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
          아직 다른 결이 없어요. 첫 번째가 되어 보세요!
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <div key={a.id} className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="font-medium">{a.self_name || "이름 없음"}</div>
              <div className="text-sm text-white/50 mt-0.5">Gen {a.gen_level} · {a.total_messages} 메시지 · 활력 {(a.vitality * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 text-center">
        <Link href="/login" className="inline-block px-6 py-3 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] font-medium hover:bg-[var(--accent)]/25 transition-colors">
          나도 키워보기
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
