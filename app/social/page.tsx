"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";

type SocialLog = {
  id: string;
  topic?: string;
  content?: string;
  conversation?: string;
  message?: string;
  outcome?: string;
  created_at: string;
};

export default function SocialPage() {
  const [logs, setLogs] = useState<SocialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/social");
        if (!res.ok) {
          setError("소셜 로그를 불러오지 못했습니다.");
          setLogs([]);
          return;
        }
        const json = await res.json().catch(() => ({ socialLogs: [] }));
        setLogs(Array.isArray(json.socialLogs) ? json.socialLogs : []);
      } catch {
        setError("소셜 로그를 불러오지 못했습니다.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

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
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-white/50">{new Date(log.created_at).toLocaleString("ko-KR")}</div>
            <div className="text-sm mt-1">{log.topic || "대화"}</div>
            <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
              {log.content || log.conversation || log.message || log.outcome || "대화 내용이 없습니다."}
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
