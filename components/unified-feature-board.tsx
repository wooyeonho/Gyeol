"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

type DashboardPreview = {
  weather_name?: string | null;
  autonomy_health?: { score: number; tier: "healthy" | "warning" | "critical" };
  social_count?: number;
  artifact_count?: number;
};

type ExploreProfile = {
  id: string;
  self_name?: string | null;
  gen_level?: number;
  vitality?: number;
};

type ActivityPreview = {
  id: string;
  kind: "log" | "artifact";
  action_type?: string;
  summary?: string;
  type?: string;
  content?: string;
  created_at?: string;
};

type SocialPreview = {
  id: string;
  topic?: string;
  conversation?: string;
  outcome?: string;
  created_at?: string;
};

type OpsPreview = {
  autonomy_health: { score: number; tier: "healthy" | "warning" | "critical"; reasons: string[] };
  recommendations: string[];
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function UnifiedFeatureBoard() {
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const briefing = useRelationshipOsStore((state) => state.briefing());

  const [dashboard, setDashboard] = useState<DashboardPreview | null>(null);
  const [explore, setExplore] = useState<ExploreProfile[]>([]);
  const [activity, setActivity] = useState<ActivityPreview[] | null>(null);
  const [social, setSocial] = useState<SocialPreview[] | null>(null);
  const [ops, setOps] = useState<OpsPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<DashboardPreview>("/api/dashboard"),
      fetchJson<{ profiles?: ExploreProfile[] }>("/api/explore"),
      fetchJson<{ items?: ActivityPreview[] }>("/api/activity"),
      fetchJson<{ socialLogs?: SocialPreview[] }>("/api/social"),
      fetchJson<OpsPreview>("/api/ops/readiness"),
    ]).then(([dashboardJson, exploreJson, activityJson, socialJson, opsJson]) => {
      if (cancelled) return;
      setDashboard(dashboardJson);
      setExplore(Array.isArray(exploreJson?.profiles) ? exploreJson!.profiles!.slice(0, 3) : []);
      setActivity(Array.isArray(activityJson?.items) ? activityJson!.items!.slice(0, 3) : null);
      setSocial(Array.isArray(socialJson?.socialLogs) ? socialJson!.socialLogs!.slice(0, 3) : null);
      setOps(opsJson);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackActivity = useMemo(() => {
    const events = [
      ...captures.slice(0, 2).map((capture) => ({
        id: capture.id,
        label: capture.source,
        text: capture.rawText,
      })),
      ...stories.slice(0, 1).map((story) => ({
        id: story.id,
        label: "story",
        text: story.title,
      })),
      ...approvals
        .filter((item) => item.status === "pending")
        .slice(0, 1)
        .map((approval) => ({
          id: approval.id,
          label: "approval",
          text: approval.title,
        })),
    ];
    return events.slice(0, 3);
  }, [approvals, captures, stories]);

  const fallbackSocial = useMemo(
    () =>
      profiles.slice(0, 3).map((profile) => ({
        id: profile.id,
        label: profile.name,
        text: `${profile.name} · 신뢰 ${profile.trustScore} / 온도 ${profile.warmthScore}`,
      })),
    [profiles],
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">기능 융합 보드</p>
          <h2 className="mt-2 text-xl font-medium">지금 기능들이 한 화면에서 이어지는 곳</h2>
        </div>
        <Link href="/features" className="text-xs text-cyan-200/75">
          기능 지도
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#0f121a] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">월드 + 운영</p>
          {dashboard ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-white/45">날씨</p>
                <p className="mt-1 font-medium">{dashboard.weather_name ?? "알 수 없음"}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-white/45">Autonomy</p>
                <p className="mt-1 font-medium">
                  {dashboard.autonomy_health?.score ?? 0} · {dashboard.autonomy_health?.tier ?? "n/a"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-white/45">Social</p>
                <p className="mt-1 font-medium">{dashboard.social_count ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-white/45">Artifacts</p>
                <p className="mt-1 font-medium">{dashboard.artifact_count ?? 0}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/62">{briefing.autopilotSummary}</p>
          )}
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/dashboard" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              대시보드
            </Link>
            <Link href="/ops" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              운영 센터
            </Link>
          </div>
          {ops?.recommendations?.length ? (
            <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-3 text-xs text-white/78">
              {ops.recommendations[0]}
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f121a] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">활동 흐름</p>
          <div className="mt-3 space-y-2">
            {(activity
              ? activity.map((item) => ({
                  id: item.id,
                  label: item.kind === "log" ? item.action_type ?? "activity" : item.type ?? "artifact",
                  text: item.summary ?? item.content ?? "",
                }))
              : fallbackActivity
            ).map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                <p className="mt-1 text-white/82">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/activity" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              활동 타임라인
            </Link>
            <Link href="/album" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              성장 앨범
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f121a] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">소셜 + 탐험</p>
          <div className="mt-3 space-y-2">
            {(social
              ? social.map((item) => ({
                  id: item.id,
                  label: item.topic ?? "social",
                  text: item.outcome ?? item.conversation ?? "",
                }))
              : fallbackSocial
            ).map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                <p className="mt-1 text-white/82">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/social" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              소셜
            </Link>
            <Link href="/explore" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              탐험
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f121a] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">확장 모드</p>
          <div className="mt-3 grid gap-2">
            {explore.length > 0 ? (
              explore.map((agent) => (
                <div key={agent.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                  <p className="font-medium">{agent.self_name ?? "이름 없음"}</p>
                  <p className="mt-1 text-white/62">
                    Gen {agent.gen_level ?? 1} · 활력 {Math.round((agent.vitality ?? 0) * 100)}%
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white/5 p-3 text-sm text-white/68">
                아직 외부 생태계 정보가 없으면 실험 기능들을 Relationship OS에서 바로 이어서 사용할 수 있습니다.
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/market" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              마켓
            </Link>
            <Link href="/room" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              룸/AR
            </Link>
            <Link href="/constellation" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              별자리
            </Link>
            <Link href="/time-travel" className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              타임트래블
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
