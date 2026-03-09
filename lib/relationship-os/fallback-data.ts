import type { RoomObject } from "@/lib/room/types";
import type { RelationshipOSSnapshot } from "@/lib/relationship-os/types";

function colorByIndex(index: number): string {
  return ["#7dd3fc", "#c4b5fd", "#f9a8d4", "#86efac", "#fcd34d"][index % 5]!;
}

export function buildFallbackActivity(snapshot: RelationshipOSSnapshot) {
  return [
    ...snapshot.captures.slice(0, 2).map((capture) => ({
      id: capture.id,
      kind: "log" as const,
      action_type: `capture:${capture.source}`,
      summary: capture.rawText,
      created_at: capture.createdAt,
    })),
    ...snapshot.stories.slice(0, 1).map((story) => ({
      id: story.id,
      kind: "artifact" as const,
      type: "night_story",
      title: story.title,
      content: story.quote,
      is_preserved: true,
      created_at: story.createdAt,
    })),
    ...snapshot.approvals.slice(0, 1).map((approval) => ({
      id: approval.id,
      kind: "log" as const,
      action_type: "approval_ready",
      summary: approval.title,
      created_at: approval.createdAt,
    })),
  ].slice(0, 4);
}

export function buildFallbackSocial(snapshot: RelationshipOSSnapshot) {
  return snapshot.profiles.slice(0, 3).map((profile, index) => ({
    id: profile.id,
    topic: `${profile.name}와의 흐름`,
    content: `${profile.name}은 지금 ${profile.spark}`,
    outcome: index === 0 ? "다음 액션을 보내면 장면이 이어질 가능성이 높습니다." : "관계 감도에 따라 다음 장면이 달라질 수 있습니다.",
    created_at: profile.lastContactAt,
  }));
}

export function buildFallbackMarket(snapshot: RelationshipOSSnapshot) {
  return snapshot.quests.slice(0, 3).map((quest, index) => ({
    id: quest.id,
    title: quest.title,
    description: `${quest.description} · 보상: ${quest.reward}`,
    price: 120 + index * 40,
    type: quest.focus,
  }));
}

export function buildFallbackRoom(snapshot: RelationshipOSSnapshot): { objects: RoomObject[]; color: string } {
  const objects: RoomObject[] = [
    ...snapshot.profiles.slice(0, 2).map((profile, index) => ({
      id: `room-profile-${profile.id}`,
      type: index === 0 ? "desk" : "chair",
      color: colorByIndex(index),
      position: [index * 1.2 - 0.8, 0, -0.4] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      content: profile.name,
    })),
    ...snapshot.captures.slice(0, 2).map((capture, index) => ({
      id: `room-capture-${capture.id}`,
      type: "book",
      color: colorByIndex(index + 2),
      position: [index * 0.8 - 0.2, 0.2, 0.9] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      content: capture.rawText,
    })),
    {
      id: "room-story-moon",
      type: "moon",
      color: "#f5f3ff",
      position: [1.6, 1.3, -1.4] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      content: snapshot.stories[0]?.title,
    },
  ];
  return { objects, color: "#a78bfa" };
}

export function buildFallbackConstellation(snapshot: RelationshipOSSnapshot) {
  const stars = [
    ...snapshot.captures.slice(0, 3).map((capture, index) => ({
      id: `star-capture-${capture.id}`,
      content: capture.rawText.slice(0, 48),
      type: capture.source,
      created_at: capture.createdAt,
      x: (index % 3) * 0.35 - 0.35,
      y: 0.25 - index * 0.18,
      z: (index % 2) * 0.2 - 0.1,
    })),
    ...snapshot.stories.slice(0, 2).map((story, index) => ({
      id: `star-story-${story.id}`,
      content: story.title,
      type: story.focus,
      created_at: story.createdAt,
      x: index * 0.4 - 0.1,
      y: -0.25 + index * 0.2,
      z: 0.12,
    })),
  ];
  return {
    stars,
    constellations: stars.length > 0 ? [{ name: "Autonomous Loop", starIds: stars.map((star) => star.id).slice(0, 4) }] : [],
  };
}

export function buildFallbackAlbum(snapshot: RelationshipOSSnapshot) {
  const milestones = [
    ...snapshot.stories.slice(0, 1).map((story) => ({
      type: "night_story",
      label: "Night story generated",
      at: story.createdAt,
      summary: story.quote,
    })),
    ...snapshot.approvals.slice(0, 2).map((approval) => ({
      type: "approval",
      label: approval.title,
      at: approval.createdAt,
      summary: approval.preview.slice(0, 100),
    })),
    ...snapshot.promises.slice(0, 2).map((promise) => ({
      type: promise.category,
      label: promise.title,
      at: promise.dueAt,
      summary: promise.context.slice(0, 100),
    })),
  ]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 6);
  return {
    milestones,
    visual: { color: "#7dd3fc", shape: "sphere" },
  };
}

export function buildFallbackDashboard(snapshot: RelationshipOSSnapshot) {
  const collectiveEmotion: Record<string, number> =
    snapshot.autonomousMode.currentFocus === "operator"
      ? { focus: 0.68, tension: 0.32 }
      : snapshot.autonomousMode.currentFocus === "relationship"
        ? { warmth: 0.63, curiosity: 0.37 }
        : { curiosity: 0.58, drift: 0.42 };
  return {
    agent_count: snapshot.profiles.length,
    social_count: snapshot.profiles.filter((profile) => profile.warmthScore >= 70).length,
    collective_emotion: collectiveEmotion,
    weather_name: snapshot.autonomousMode.currentFocus === "operator" ? "Pressure Front" : snapshot.autonomousMode.currentFocus === "relationship" ? "Warm Current" : "Aurora Drift",
    artifact_count: snapshot.stories.length + snapshot.captures.length,
    autonomy_enabled_count: 1,
    stale_heartbeat_6h: 0,
    stale_dream_24h: 0,
    echo_count: 0,
    cron_freshness: [
      { job_name: "cron:heartbeat", minutes_since_update: 24 },
      { job_name: "cron:dream", minutes_since_update: 64 },
      { job_name: "cron:learner", minutes_since_update: 91 },
    ],
    autonomy_health: {
      score: Math.max(72, 100 - snapshot.promises.filter((promise) => promise.risk === "high" && promise.status !== "done").length * 8),
      tier: snapshot.promises.some((promise) => promise.risk === "high" && promise.status !== "done") ? ("warning" as const) : ("healthy" as const),
      reasons: snapshot.promises.some((promise) => promise.risk === "high" && promise.status !== "done") ? ["고위험 열린 루프가 남아 있습니다."] : [],
    },
  };
}

export function buildFallbackExplore(snapshot: RelationshipOSSnapshot) {
  return snapshot.profiles.map((profile, index) => ({
    id: profile.id,
    self_name: profile.name,
    vitality: Math.min(1, Math.max(0.4, profile.warmthScore / 100)),
    total_messages: 12 + index * 7,
    gen_level: 1 + Math.floor(profile.trustScore / 20),
  }));
}

export function buildFallbackOps(snapshot: RelationshipOSSnapshot) {
  const critical = snapshot.promises.filter((promise) => promise.risk === "high" && promise.status !== "done").length;
  return {
    checked_at: new Date().toISOString(),
    env_status: [
      { key: "NEXT_PUBLIC_SUPABASE_URL", configured: false },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", configured: false },
      { key: "CRON_SECRET", configured: false },
    ],
    autonomy_health: {
      score: critical > 0 ? 74 : 91,
      tier: critical > 0 ? ("warning" as const) : ("healthy" as const),
      reasons: critical > 0 ? ["고위험 약속이 남아 있어 자동진화 포커스가 실행 압력으로 기울었습니다."] : [],
    },
    stale_counts: {
      stale_heartbeat_6h: 0,
      stale_dream_24h: 0,
      echo_count: 0,
      stale_cron_jobs_24h: 0,
    },
    alert_summary_24h: {
      total: critical,
      info: 0,
      warning: critical,
      critical: 0,
    },
    recent_alerts: critical
      ? [
          {
            level: "warning",
            source: "relationship-os",
            code: "OPEN_LOOP_PRESSURE",
            message: "고위험 열린 루프가 자동진화 포커스를 실행 압력으로 바꾸고 있습니다.",
            created_at: new Date().toISOString(),
          },
        ]
      : [],
    recommendations: critical ? ["우선순위 약속 하나를 닫아 자동진화 루프를 안정화하세요."] : ["현재 데모 상태는 안정적입니다."],
  };
}

export function buildFallbackSettings(snapshot: RelationshipOSSnapshot) {
  return {
    self_name: "GYEOL",
    gen_level: 2,
    total_messages: snapshot.captures.length + snapshot.stories.length * 2,
    vitality: Math.min(1, 0.65 + snapshot.profiles.length * 0.05),
    mood: snapshot.autonomousMode.currentFocus === "operator" ? "curious" : "warm",
    coins: 180,
    config: {
      autonomous_enabled: true,
      dream_enabled: true,
      social_enabled: true,
    },
  };
}

export function buildFallbackAdopt(snapshot: RelationshipOSSnapshot) {
  return snapshot.profiles.slice(0, 3).map((profile, index) => ({
    agent_id: `adopt-${profile.id}`,
    self_name: `${profile.name}의 잔향`,
    vitality: Math.max(0.4, profile.warmthScore / 100),
    memory_count: 6 + index * 4,
    days_alive: 20 + index * 12,
  }));
}
