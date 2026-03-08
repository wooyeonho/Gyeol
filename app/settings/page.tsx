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

type Connections = {
  github?: boolean;
  notion?: boolean;
  slack?: boolean;
  telegram?: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Connections>({});
  const [integrationInput, setIntegrationInput] = useState<Record<string, string>>({});
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : { state: null }))
      .then((d: { state?: State | null; connections?: Connections }) => {
        setState(d.state ?? null);
        setConnections(d.connections ?? {});
      })
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

  async function handleConnect(service: "github" | "notion" | "slack") {
    const token = integrationInput[service]?.trim();
    if (!token) return;
    setIntegrationStatus((s) => ({ ...s, [service]: "saving..." }));
    const body: Record<string, string> = { access_token: token };
    if (service === "slack" && integrationInput.slack_channel) {
      body.channel_id = integrationInput.slack_channel;
    }
    const res = await fetch(`/api/integrations/${service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setConnections((c) => ({ ...c, [service]: true }));
      setIntegrationInput((i) => ({ ...i, [service]: "" }));
      setIntegrationStatus((s) => ({ ...s, [service]: "connected" }));
    } else {
      setIntegrationStatus((s) => ({ ...s, [service]: "failed" }));
    }
  }

  async function handleSync(service: "github" | "notion") {
    setSyncing((s) => ({ ...s, [service]: true }));
    const res = await fetch(`/api/integrations/${service}`);
    const data = res.ok ? (await res.json() as { synced?: number }) : null;
    setIntegrationStatus((s) => ({
      ...s,
      [service]: res.ok ? `synced ${data?.synced ?? 0} memories` : "sync failed",
    }));
    setSyncing((s) => ({ ...s, [service]: false }));
  }

  async function handleTelegramLink() {
    const chatId = integrationInput.telegram?.trim();
    if (!chatId) return;
    setIntegrationStatus((s) => ({ ...s, telegram: "saving..." }));
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_chat_id: chatId }),
    });
    if (res.ok) {
      setConnections((c) => ({ ...c, telegram: true }));
      setIntegrationInput((i) => ({ ...i, telegram: "" }));
      setIntegrationStatus((s) => ({ ...s, telegram: "linked" }));
    } else {
      setIntegrationStatus((s) => ({ ...s, telegram: "failed" }));
    }
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
        <div className="bg-white/5 rounded-xl p-4 space-y-4">
          <p className="text-white/60 text-sm">Integrations</p>
          {(
            [
              { key: "github" as const, label: "GitHub", placeholder: "Personal access token", hint: "Syncs recent activity as memories", canSync: true },
              { key: "notion" as const, label: "Notion", placeholder: "Integration token (secret_...)", hint: "Syncs recent pages as memories", canSync: true },
              { key: "slack" as const, label: "Slack", placeholder: "Bot token (xoxb-...)", hint: "Sends messages to your channel", canSync: false },
            ]
          ).map(({ key, label, placeholder, hint, canSync }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  {connections[key] && canSync && (
                    <button
                      onClick={() => handleSync(key as "github" | "notion")}
                      disabled={syncing[key]}
                      className="text-xs text-white/50 hover:text-white/80 disabled:opacity-40"
                    >
                      {syncing[key] ? "syncing..." : "sync now"}
                    </button>
                  )}
                  {connections[key] ? (
                    <span className="text-xs text-green-400">connected</span>
                  ) : (
                    <span className="text-xs text-white/30">not connected</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/40 mb-2">{hint}</p>
              {key === "slack" && (
                <input
                  type="text"
                  value={integrationInput.slack_channel ?? ""}
                  onChange={(e) => setIntegrationInput((i) => ({ ...i, slack_channel: e.target.value }))}
                  placeholder="Channel ID (optional)"
                  className="w-full bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 mb-1"
                />
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={integrationInput[key] ?? ""}
                  onChange={(e) => setIntegrationInput((i) => ({ ...i, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30"
                />
                <button
                  onClick={() => handleConnect(key)}
                  disabled={!integrationInput[key]?.trim()}
                  className="bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-lg px-3 py-1.5 text-sm"
                >
                  Save
                </button>
              </div>
              {integrationStatus[key] && (
                <p className="text-xs mt-1 text-white/50">{integrationStatus[key]}</p>
              )}
            </div>
          ))}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Telegram</span>
              {connections.telegram ? (
                <span className="text-xs text-green-400">linked</span>
              ) : (
                <span className="text-xs text-white/30">not linked</span>
              )}
            </div>
            <p className="text-xs text-white/40 mb-2">Chat with your Gyeol via Telegram bot</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={integrationInput.telegram ?? ""}
                onChange={(e) => setIntegrationInput((i) => ({ ...i, telegram: e.target.value }))}
                placeholder="Telegram chat ID"
                className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30"
              />
              <button
                onClick={handleTelegramLink}
                disabled={!integrationInput.telegram?.trim()}
                className="bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-lg px-3 py-1.5 text-sm"
              >
                Link
              </button>
            </div>
            {integrationStatus.telegram && (
              <p className="text-xs mt-1 text-white/50">{integrationStatus.telegram}</p>
            )}
          </div>
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
