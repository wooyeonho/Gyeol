"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TimelineItem = {
  id: string;
  kind: "log" | "artifact";
  action_type?: string;
  type?: string;
  summary?: string;
  content?: string;
  created_at: string;
  expires_at?: string;
  is_preserved?: boolean;
  is_public?: boolean;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "dream", label: "Dream" },
  { key: "creation", label: "Creation" },
  { key: "image", label: "Image" },
  { key: "music", label: "Music" },
  { key: "comic", label: "Comic" },
] as const;

const ICON_MAP: Record<string, { icon: string; color: string }> = {
  heartbeat: { icon: "○", color: "text-gray-400" },
  personality_evolution: { icon: "◇", color: "text-purple-400" },
  evolution: { icon: "◆", color: "text-amber-400" },
  self_naming: { icon: "✦", color: "text-yellow-300" },
  dream: { icon: "☽", color: "text-indigo-300" },
  artifact_creation: { icon: "★", color: "text-white/80" },
  social_encounter: { icon: "◎", color: "text-cyan-400" },
  scar: { icon: "●", color: "text-red-400" },
  death: { icon: "■", color: "text-black" },
  perspective_journal: { icon: "△", color: "text-emerald-400" },
  independence_suggestion: { icon: "◐", color: "text-amber-300" },
  role_declaration: { icon: "◉", color: "text-blue-300" },
  birthday_anniversary: { icon: "◎", color: "text-pink-400" },
  comic_creation: { icon: "▤", color: "text-orange-400" },
  video_creation: { icon: "▶", color: "text-violet-400" },
  graduation: { icon: "🎓", color: "text-amber-300" },
  species_emergence: { icon: "◇", color: "text-emerald-400" },
  confession: { icon: "◔", color: "text-blue-400" },
  thanks: { icon: "♥", color: "text-rose-400" },
  emotion_image: { icon: "◎", color: "text-pink-300" },
  speech_analysis: { icon: "◑", color: "text-cyan-300" },
  growth_detected: { icon: "⬆", color: "text-emerald-400" },
  investment_pattern: { icon: "◈", color: "text-amber-400" },
  feedback_request: { icon: "?", color: "text-violet-300" },
  agent_letter: { icon: "✉", color: "text-indigo-300" },
};

function getStyle(item: TimelineItem) {
  if (item.kind === "artifact") {
    const t = item.type ?? "";
    if (t === "dream_journal") return ICON_MAP.dream;
    if (t === "will") return { icon: "●", color: "text-red-400" };
    if (t === "perspective_journal") return ICON_MAP.perspective_journal;
    if (t === "birthday_review") return ICON_MAP.birthday_anniversary;
    if (t === "image" || t === "emotion_image") return { icon: "◇", color: "text-blue-300" };
    if (t === "music") return { icon: "♫", color: "text-green-400" };
    if (t === "comic") return ICON_MAP.comic_creation;
    if (t === "video") return ICON_MAP.video_creation;
    return ICON_MAP.artifact_creation;
  }
  return ICON_MAP[item.action_type ?? ""] ?? { icon: "·", color: "text-white/50" };
}

function formatDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function ttlText(expiresAt?: string) {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  const left = Math.max(0, Math.round((end - Date.now()) / 60000));
  if (left <= 0) return "Expired";
  if (left < 60) return `${left}m left`;
  return `${Math.floor(left / 60)}h left`;
}

async function patchArtifact(id: string, patch: { is_preserved?: boolean; is_public?: boolean }) {
  await fetch(`/api/artifacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export default function ActivityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const q = tab === "all" ? "" : `?type=${tab}`;
    fetch(`/api/activity${q}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab, refresh]);

  function renderContent(item: TimelineItem) {
    if (item.kind === "log") {
      return <p className="text-white/90 text-sm break-words">{String(item.summary ?? "").slice(0, 300)}</p>;
    }
    const t = item.type ?? "";
    const content = item.content ?? "";
    if (t === "image" && (content.startsWith("data:image") || content.startsWith("http"))) {
      return (
        <div className="mt-2">
          <img src={content} alt="artifact" className="rounded-lg max-h-48 w-auto object-contain bg-white/5" />
        </div>
      );
    }
    if (t === "music") {
      try {
        const params = JSON.parse(content) as { tempo?: number; mood?: string };
        return (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/60 text-xs">Tempo {params.tempo ?? "—"} · {params.mood ?? "—"}</span>
            <a href="/" className="text-xs text-indigo-400">Play on home</a>
          </div>
        );
      } catch {
        return <p className="text-white/60 text-xs">Music</p>;
      }
    }
    if (t === "comic") {
      try {
        const { panels } = JSON.parse(content) as { panels?: { image: string; text: string }[] };
        if (Array.isArray(panels) && panels.length) {
          return (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {panels.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-white/5 rounded-lg overflow-hidden">
                  {p.image ? <img src={p.image} alt="" className="w-full aspect-square object-cover" /> : null}
                  <p className="text-xs text-white/80 p-1.5">{p.text?.slice(0, 60)}</p>
                </div>
              ))}
            </div>
          );
        }
      } catch {
        // ignore
      }
    }
    if (t === "video") {
      try {
        const data = JSON.parse(content) as { kind?: string; title?: string; frames?: unknown[] };
        return <p className="text-white/60 text-xs">{data.title ?? "Video"} · {data.frames?.length ?? 0} frames</p>;
      } catch {
        return <p className="text-white/60 text-xs">Video</p>;
      }
    }
    return <p className="text-white/90 text-sm break-words">{String(content).slice(0, 300)}</p>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Activity</h1>
        <Link href="/constellation" className="text-sm text-white/50 hover:text-white/80">Constellation</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === key ? "bg-white/20 text-white" : "bg-white/5 text-white/60"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-white/50">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-white/60">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const { icon, color } = getStyle(item);
            const isArtifact = item.kind === "artifact";
            const artifactItem = item as TimelineItem & { expires_at?: string; is_preserved?: boolean; is_public?: boolean };
            return (
              <li key={`${item.kind}-${item.id}`} className="bg-white/5 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex gap-3">
                  <span className={`shrink-0 ${color}`}>{icon}</span>
                  <div className="min-w-0 flex-1">
                    {renderContent(item)}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <p className="text-white/40 text-xs">{formatDate(item.created_at)}</p>
                      {artifactItem.expires_at ? (
                        <span className="text-white/30 text-xs">{ttlText(artifactItem.expires_at)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {isArtifact && (
                  <div className="flex gap-2 ml-8">
                    <button
                      onClick={() => patchArtifact(item.id, { is_preserved: !artifactItem.is_preserved }).then(() => setRefresh((r) => r + 1))}
                      className="text-xs text-white/50 hover:text-white/80"
                    >
                      {artifactItem.is_preserved ? "Unpreserve" : "Preserve"}
                    </button>
                    <button
                      onClick={() => patchArtifact(item.id, { is_public: !artifactItem.is_public }).then(() => setRefresh((r) => r + 1))}
                      className="text-xs text-white/50 hover:text-white/80"
                    >
                      {artifactItem.is_public ? "Unshare" : "Share"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
