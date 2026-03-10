"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";

type Milestone = { type: string; label: string; at: string; summary?: string };

export default function AlbumPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [visual, setVisual] = useState<{ color?: string; shape?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackClientEvent(CLIENT_EVENT.albumOpened);
  }, []);

  useEffect(() => {
    fetch("/api/album")
      .then((r) => (r.ok ? r.json() : { milestones: [] }))
      .then((d) => {
        setMilestones(d.milestones ?? []);
        setVisual(d.visual ?? null);
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black p-4 pb-24 text-white">
      <div className="max-w-lg mx-auto">
        <h1 className="mb-2 text-xl font-semibold">성장 앨범</h1>
        <p className="mb-6 text-sm text-white/50">결의 주요 순간과 마일스톤을 시간순으로 다시 돌아봅니다.</p>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-6 text-center text-white/50 text-sm">
            아직 기록된 마일스톤이 없습니다. 대화를 이어가며 앨범을 채워보세요.
          </div>
        ) : (
          <ul className="space-y-4">
            {milestones.map((m, i) => (
              <li
                key={`${m.type}-${m.at}`}
                className="flex gap-4 items-start rounded-xl bg-white/5 p-4 border border-white/10"
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium"
                  style={{ background: visual?.color ? `${visual.color}33` : "rgba(255,255,255,0.1)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{m.label}</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {new Date(m.at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  {m.summary && <p className="text-white/70 text-sm mt-2 truncate">{m.summary}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            홈
          </Link>
          <Link
            href="/activity"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            활동
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
