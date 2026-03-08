"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

type Log = { action_type: string; summary?: string; created_at: string };
type Artifact = { id: string; type: string; content?: string; title?: string; is_preserved?: boolean; created_at: string };

const TYPE_STYLES: Record<string, string> = {
  heartbeat: "bg-white/10",
  evolution: "bg-yellow-500/20 border-yellow-500/40",
  dream: "bg-purple-500/20 border-purple-500/40",
  artifact_creation: "bg-blue-500/20 border-blue-500/40",
  social_encounter: "bg-green-500/20 border-green-500/40",
  scar: "bg-red-500/20 border-red-500/40",
  self_naming: "bg-amber-500/20 border-amber-500/40",
};

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

      setLogs((logData || []).map((l) => ({ ...l, kind: "log" as const })));
      setArtifacts((artData || []).map((a) => ({ ...a, kind: "artifact" as const })));
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">활동</h1>
      <div className="space-y-3">
        {combined.map((item, i) => (
          <div
            key={item.kind + "-" + i}
            className={`rounded-xl p-4 border ${TYPE_STYLES[item.kind === "log" ? (item as Log).action_type : (item as Artifact).type] || "bg-white/5 border-white/10"}`}
          >
            {item.kind === "log" ? (
              <>
                <div className="text-xs text-white/50">{item.action_type}</div>
                <div className="text-sm mt-1">{item.summary}</div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-white/50">{(item as Artifact).type}</div>
                    <div className="text-sm mt-1">{(item as Artifact).title || (item as Artifact).content?.slice(0, 80)}</div>
                  </div>
                  <button
                    onClick={() => togglePreserved((item as Artifact).id, (item as Artifact).is_preserved || false)}
                    className="text-xs px-2 py-1 rounded bg-white/10"
                  >
                    {(item as Artifact).is_preserved ? "보관됨" : "보관"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
