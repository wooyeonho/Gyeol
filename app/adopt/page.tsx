"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type BoardItem = { id: string; agent_id: string; status: string; message?: string };

export default function AdoptPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("adoption_board").update({ status: "adopted" }).eq("agent_id", agentId);
    await supabase.from("agents").update({ user_id: user.id }).eq("id", agentId);
    setItems((prev) => prev.filter((i) => i.agent_id !== agentId));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">입양</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-between items-center">
            <div>
              <div className="text-sm text-white/60">에이전트</div>
              <div>{item.message || "메시지 없음"}</div>
            </div>
            <button onClick={() => adopt(item.agent_id)} className="px-4 py-2 rounded-lg bg-white/20">
              입양하기
            </button>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
