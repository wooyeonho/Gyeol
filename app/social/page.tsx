"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type SocialLog = { id: string; agent_a_id: string; agent_b_id: string; conversation?: string; topic?: string; outcome?: string; created_at: string };

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [loading, setLoading] = useState(true);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">소셜</h1>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-white/50">{new Date(log.created_at).toLocaleString("ko-KR")}</div>
            <div className="text-sm mt-1">{log.topic || "대화"}</div>
            <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">{log.conversation || log.outcome}</div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
