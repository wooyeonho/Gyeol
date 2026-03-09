"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { buildFallbackSocial } from "@/lib/relationship-os/fallback-data";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

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
  const [demoMode, setDemoMode] = useState(false);
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const quests = useRelationshipOsStore((state) => state.quests);
  const autonomousMode = useRelationshipOsStore((state) => state.autonomousMode);
  const fallbackLogs = useMemo(
    () =>
      buildFallbackSocial({
        profiles,
        promises,
        approvals,
        captures,
        stories,
        quests,
        autonomousMode,
      }),
    [approvals, autonomousMode, captures, profiles, promises, quests, stories],
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/social");
        if (!res.ok) {
          setDemoMode(true);
          setLogs(fallbackLogs);
          return;
        }
        const json = await res.json().catch(() => ({ socialLogs: [] }));
        setLogs(Array.isArray(json.socialLogs) ? json.socialLogs : []);
      } catch {
        setDemoMode(true);
        setLogs(fallbackLogs);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [fallbackLogs]);

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
      {demoMode && hasHydrated && (
        <div className="mb-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-sm text-white/80">
          실소셜 로그 대신 현재 관계 흐름을 기반으로 미리보기 장면을 보여주고 있습니다.
        </div>
      )}
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
