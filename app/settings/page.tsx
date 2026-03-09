"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

type AgentConfig = Record<string, boolean | string | number | null | undefined>;
type AgentState = {
  agent_id?: string;
  id?: string;
  self_name?: string;
  gen_level?: number;
  total_messages?: number;
  vitality?: number;
  mood?: string;
  coins?: number;
  config?: AgentConfig;
};

export default function SettingsPage() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          setError("설정 정보를 불러오지 못했습니다.");
          return;
        }
        const json = await res.json().catch(() => ({ state: null }));
        setState(json.state ?? null);
      } catch {
        setError("설정 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setError("설정 변경에 실패했습니다.");
      return;
    }
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    setState({ ...state, config });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">설정</h1>
      {error && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">{error}</div>}
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">이름</div>
          <div>{state?.self_name || "—"}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">Gen 레벨</div>
          <div>{state?.gen_level ?? 1}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">총 메시지</div>
          <div>{state?.total_messages ?? 0}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">활력</div>
          <div>{((state?.vitality ?? 1) * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">기분</div>
          <div>{state?.mood || "—"}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-sm text-white/60">코인</div>
          <div>{state?.coins ?? 0}</div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span>자율 모드</span>
            <button
              onClick={() => toggleConfig("autonomous_enabled", !config.autonomous_enabled)}
              className={`px-3 py-1 rounded ${config.autonomous_enabled !== false ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.autonomous_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>드림 엔진</span>
            <button
              onClick={() => toggleConfig("dream_enabled", !config.dream_enabled)}
              className={`px-3 py-1 rounded ${config.dream_enabled ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.dream_enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>소셜</span>
            <button
              onClick={() => toggleConfig("social_enabled", !config.social_enabled)}
              className={`px-3 py-1 rounded ${config.social_enabled !== false ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.social_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>자율 진화 제안</span>
            <button
              onClick={() => toggleConfig("autonomy_proposals_enabled", config.autonomy_proposals_enabled === false)}
              className={`px-3 py-1 rounded ${config.autonomy_proposals_enabled !== false ? "bg-green-500/30" : "bg-white/10"}`}
            >
              {config.autonomy_proposals_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>자율 진화 실행 (킬 스위치)</span>
            <button
              onClick={() => toggleConfig("autonomy_execute_enabled", config.autonomy_execute_enabled !== true)}
              className={`px-3 py-1 rounded ${config.autonomy_execute_enabled === true ? "bg-red-500/30" : "bg-white/10"}`}
            >
              {config.autonomy_execute_enabled === true ? "ON" : "OFF"}
            </button>
          </div>
          <p className="text-xs text-white/50">
            안전을 위해 기본값은 OFF입니다. 승인된 제안만 실행되며, 언제든 OFF로 즉시 중지할 수 있습니다.
          </p>
        </div>

        <Link href="/autonomy" className="block text-center w-full py-3 rounded-xl bg-indigo-500/20 text-indigo-300">
          자율 진화 콘솔 열기
        </Link>

        <button onClick={logout} className="w-full py-3 rounded-xl bg-red-500/20 text-red-400">
          로그아웃
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
