"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type State = {
  self_name?: string | null;
  gen_level?: number;
  total_messages?: number;
  vitality?: number;
  mood?: string;
  config?: { autonomous_enabled?: boolean; dream_enabled?: boolean; social_enabled?: boolean; allow_cross_message?: boolean };
};

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : { state: null }))
      .then((d: { state?: State | null }) => setState(d.state ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: "autonomous_enabled" | "dream_enabled" | "social_enabled" | "allow_cross_message") {
    const current = state?.config?.[key] ?? true;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !current }),
    });
    if (res.ok) setState((s) => ({ ...s!, config: { ...s?.config, [key]: !current } }));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return <div className="min-h-screen bg-black text-white p-4 pb-20">Loading...</div>;

  const config = state?.config ?? {};

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-sm">Name</p>
          <p className="text-white">{state?.self_name ?? "—"}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-sm">Gen level</p>
          <p className="text-white">{state?.gen_level ?? 1}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-sm">Total messages</p>
          <p className="text-white">{state?.total_messages ?? 0}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-sm">Vitality</p>
          <p className="text-white">{state?.vitality != null ? Math.round(state.vitality * 100) + "%" : "—"}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/60 text-sm">Mood</p>
          <p className="text-white">{state?.mood ?? "—"}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <p className="text-white/60 text-sm">Toggles</p>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">Autonomous (heartbeat)</span>
            <input
              type="checkbox"
              checked={config.autonomous_enabled !== false}
              onChange={() => handleToggle("autonomous_enabled")}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">Dream engine</span>
            <input
              type="checkbox"
              checked={config.dream_enabled !== false}
              onChange={() => handleToggle("dream_enabled")}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">Social</span>
            <input
              type="checkbox"
              checked={config.social_enabled !== false}
              onChange={() => handleToggle("social_enabled")}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">Allow message to other Gyeol</span>
            <input
              type="checkbox"
              checked={config.allow_cross_message === true}
              onChange={() => handleToggle("allow_cross_message")}
              className="rounded"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/album" className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
            Growth album
          </a>
          <a href="/time-travel" className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
            Time travel
          </a>
        </div>
        <button onClick={handleSignOut} className="w-full bg-white/10 rounded-lg px-4 py-2 text-sm">
          Sign out
        </button>
      </div>
    </div>
  );
}
