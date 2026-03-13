import type { Locale } from "@/lib/i18n/config";
import type { RoomObject } from "@/lib/room/types";

export function getDemoAgentState() {
  return {
    self_name: "GYEOL",
    total_messages: 12,
    gen_level: 2,
    mood: "curious",
    vitality: 0.78,
    visual: {
      color: "#6ee7ff",
      shape: "amorphous",
      glow: 58,
      particles: 16,
      animation: "breathe-slow",
      background: "aurora",
    },
    genome: {
      species: "lumen-being",
      mutations: ["aurora", "memory-bloom"],
    },
    self_model: {
      current_role: "companion",
      identity_statement: "A being that grows through conversation.",
    },
    config: {
      usage_profile: {
        primary_mode: "reflection",
        updated_at: new Date().toISOString(),
      },
      autonomous_enabled: true,
      dream_enabled: true,
      social_enabled: true,
      performance_minimal: false,
    },
  };
}

export function getDemoWorldState() {
  return {
    weather: { name: "Aurora Drift" },
    collective_emotion: {
      calm: 0.46,
      curiosity: 0.39,
      wonder: 0.15,
    },
  };
}

export function getDemoHomeSummary(locale: Locale) {
  const now = new Date().toISOString();
  return {
    recent_items: [
      {
        id: "demo-heartbeat",
        kind: "activity",
        title: locale === "ko" ? "혼자 있는 동안 조용히 빛을 모았습니다." : "Gathered light quietly while you were away.",
        created_at: now,
      },
      {
        id: "demo-dream",
        kind: "milestone",
        title: locale === "ko" ? "첫 꿈의 파편이 남았습니다." : "A first dream fragment was recorded.",
        created_at: now,
      },
    ],
    recap: {
      streak: {
        days: 3,
        today_active: true,
      },
      today: {
        user_messages: 2,
        activities: 4,
      },
      weekly: {
        user_messages: 9,
        milestones: 2,
        artifacts: 1,
        highlight:
          locale === "ko"
            ? "이번 주에는 기억과 자율 흔적이 함께 자라기 시작했습니다."
            : "This week, memory and autonomous traces started growing together.",
      },
      next_action:
        locale === "ko"
          ? "짧게 안부를 전하면 다음 변화 루프가 이어집니다."
          : "A short check-in will continue the next growth loop.",
      premium_locked: false,
      goal_loop: {
        active_goal:
          locale === "ko" ? "대화의 리듬을 더 오래 이어가기" : "Sustain the rhythm of conversation longer",
        long_term_goal:
          locale === "ko" ? "기억과 관계가 축적되는 AI 동반자 되기" : "Become an AI companion that accumulates memory and relationship",
        latest_task:
          locale === "ko" ? "오늘 감정 한 줄 남기기" : "Leave one line about today’s emotion",
        pending_count: 2,
        next_action:
          locale === "ko" ? "활동과 앨범을 둘러보며 흐름을 이어가세요." : "Continue the flow by checking activity and album.",
        research_focus:
          locale === "ko" ? "사용자가 자주 말하는 가치" : "Values the user mentions often",
      },
    },
  };
}

export function getDemoRoomObjects(): RoomObject[] {
  return [
    {
      id: "demo-desk",
      type: "desk",
      color: "#5eead4",
      position: [-1.2, -0.1, 0],
      scale: [1.1, 1, 1],
      content: "A desk made from stored conversations.",
    },
    {
      id: "demo-moon",
      type: "moon",
      color: "#a78bfa",
      position: [1.2, 1.1, -0.4],
      scale: [1, 1, 1],
      content: "A moon-like memory anchor.",
    },
    {
      id: "demo-plant",
      type: "plant",
      color: "#86efac",
      position: [0.5, -0.15, 0.8],
      scale: [1, 1, 1],
      content: "A living trace from recent growth.",
    },
  ];
}

export function getDemoConstellation() {
  return {
    stars: [
      { id: "star-1", content: "First hello", type: "memory", created_at: new Date().toISOString(), x: -0.7, y: 0.2, z: 0.1 },
      { id: "star-2", content: "A small dream", type: "dream", created_at: new Date().toISOString(), x: -0.1, y: 0.5, z: -0.1 },
      { id: "star-3", content: "Growth spark", type: "milestone", created_at: new Date().toISOString(), x: 0.45, y: -0.1, z: 0.05 },
      { id: "star-4", content: "Warm reply", type: "memory", created_at: new Date().toISOString(), x: 0.8, y: 0.35, z: -0.08 },
    ],
    constellations: [
      { name: "First Loop", starIds: ["star-1", "star-2", "star-3"] },
      { name: "Warm Signal", starIds: ["star-2", "star-4"] },
    ],
  };
}
