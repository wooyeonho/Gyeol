"use client";

import { useEffect, useState } from "react";
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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="h-3 w-3 rounded-full bg-[var(--accent)] animate-pulse" />
      </div>
    );
  }

  const config: AgentConfig = state?.config || {};

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20 pb-24 px-4">
      <h1 className="font-display text-xl font-semibold mb-6 tracking-tight">설정</h1>
      <div className="space-y-3">
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">이름</div>
          <div className="mt-0.5">{state?.self_name || "—"}</div>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">Gen 레벨</div>
          <div className="mt-0.5">{state?.gen_level ?? 1}</div>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">총 메시지</div>
          <div className="mt-0.5">{state?.total_messages ?? 0}</div>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">활력</div>
          <div className="mt-0.5">{((state?.vitality ?? 1) * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">기분</div>
          <div className="mt-0.5">{state?.mood || "—"}</div>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">코인</div>
          <div className="mt-0.5">{state?.coins ?? 0}</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">자율 모드</span>
            <button
              onClick={() => toggleConfig("autonomous_enabled", !config.autonomous_enabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.autonomous_enabled !== false ? "bg-[var(--vitality-high)]/20 text-[var(--vitality-high)]" : "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
            >
              {config.autonomous_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">드림 엔진</span>
            <button
              onClick={() => toggleConfig("dream_enabled", !config.dream_enabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.dream_enabled ? "bg-[var(--vitality-high)]/20 text-[var(--vitality-high)]" : "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
            >
              {config.dream_enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">소셜</span>
            <button
              onClick={() => toggleConfig("social_enabled", !config.social_enabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.social_enabled !== false ? "bg-[var(--vitality-high)]/20 text-[var(--vitality-high)]" : "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
            >
              {config.social_enabled !== false ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3.5 rounded-xl bg-[var(--vitality-low)]/15 text-[var(--vitality-low)] font-medium"
        >
          로그아웃
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
