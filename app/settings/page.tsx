"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agent) { setLoading(false); return; }

      const { data } = await supabase.from("agent_state").select("*").eq("agent_id", agent.id).single();
      setState(data);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function toggleConfig(key: string, value: boolean) {
    if (!state) return;
    const config: AgentConfig = { ...(state.config || {}), [key]: value };
    await supabase.from("agent_state").update({ config }).eq("agent_id", state.agent_id || state.id);
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 pb-24 px-4">
      <h1 className="text-xl font-semibold mb-4">설정</h1>
      <div className="space-y-4">
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">이름</div>
          <div>{state?.self_name || "—"}</div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">Gen 레벨</div>
          <div>{state?.gen_level ?? 1}</div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">총 메시지</div>
          <div>{state?.total_messages ?? 0}</div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">활력</div>
          <div>{((state?.vitality ?? 1) * 100).toFixed(0)}%</div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">기분</div>
          <div>{state?.mood || "—"}</div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-sm text-white/60">코인</div>
          <div>{state?.coins ?? 0}</div>
        </div>

        <Link href="/social" className="block rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] text-white/80 hover:bg-white/5 transition-colors">
          소셜 기록 보기 →
        </Link>
        <div className="rounded-xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] space-y-3">
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
        </div>

        <button onClick={logout} className="w-full py-3 rounded-xl bg-red-500/20 text-red-400">
          로그아웃
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
