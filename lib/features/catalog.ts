import type { Locale } from "@/lib/i18n/config";

export type FeatureStatus = "ready" | "beta" | "planned";
export type FeatureCategory = "core" | "growth" | "world" | "creative" | "experimental" | "operations";

export type FeatureItem = {
  id: string;
  name: string;
  summary: string;
  href: string;
  category: FeatureCategory;
  status: FeatureStatus;
};

type FeatureCatalogEntry = Omit<FeatureItem, "name" | "summary"> & {
  name: {
    ko: string;
    en: string;
  };
  summary: {
    ko: string;
    en: string;
  };
};

const FEATURE_CATALOG_BASE: FeatureCatalogEntry[] = [
  {
    id: "core-chat",
    name: {
      ko: "AI 존재와의 대화",
      en: "Conversation with your AI being",
    },
    summary: {
      ko: "나만의 GYEOL과 실시간으로 대화하고, 그 대화가 기억과 관계의 출발점이 됩니다.",
      en: "Talk with your own GYEOL in real time, and let that conversation become the start of memory and relationship.",
    },
    href: "/",
    category: "core",
    status: "ready",
  },
  {
    id: "activity-timeline",
    name: {
      ko: "활동 타임라인",
      en: "Activity timeline",
    },
    summary: {
      ko: "결이 남긴 자율 로그와 생성 결과물을 시간순으로 확인합니다.",
      en: "Review autonomous logs and generated outputs from Gyeol in chronological order.",
    },
    href: "/activity",
    category: "growth",
    status: "ready",
  },
  {
    id: "social-encounter",
    name: {
      ko: "소셜 인카운터",
      en: "Social encounters",
    },
    summary: {
      ko: "다른 존재와의 교류 흔적을 보며 결의 세계가 어떻게 확장되는지 확인합니다.",
      en: "See how Gyeol's world expands through traces of encounters with other beings.",
    },
    href: "/social",
    category: "growth",
    status: "ready",
  },
  {
    id: "market",
    name: {
      ko: "마켓 탐색",
      en: "Market exploration",
    },
    summary: {
      ko: "결의 성장과 생태계에 연결되는 아이템과 자원을 탐색합니다.",
      en: "Explore items and resources connected to Gyeol's growth and ecosystem.",
    },
    href: "/market",
    category: "experimental",
    status: "ready",
  },
  {
    id: "settings",
    name: {
      ko: "에이전트 설정",
      en: "Agent settings",
    },
    summary: {
      ko: "자율 모드, 드림, 소셜 같은 결의 생활 방식을 조정합니다.",
      en: "Adjust how Gyeol lives through autonomy, dreams, social behavior, and more.",
    },
    href: "/settings",
    category: "core",
    status: "ready",
  },
  {
    id: "explore",
    name: {
      ko: "생태계 탐험",
      en: "Ecosystem explore",
    },
    summary: {
      ko: "다른 사용자의 존재들이 어떤 이름과 성장 궤적을 갖는지 둘러봅니다.",
      en: "Browse how other users' beings are named and how they are growing.",
    },
    href: "/explore",
    category: "world",
    status: "ready",
  },
  {
    id: "dashboard",
    name: {
      ko: "공개 대시보드",
      en: "Public dashboard",
    },
    summary: {
      ko: "플랫폼 전체의 활동량, 월드 분위기, 공개 가능한 생태계 지표를 한눈에 확인합니다.",
      en: "See platform activity, world mood, and public ecosystem metrics at a glance.",
    },
    href: "/dashboard",
    category: "operations",
    status: "ready",
  },
  {
    id: "ops-center",
    name: {
      ko: "운영 센터",
      en: "Operations center",
    },
    summary: {
      ko: "운영자 관점에서 자율활동 건강 점수, 경보, 운영 준비도를 확인합니다.",
      en: "Monitor autonomy health, alerts, and operational readiness from an operator view.",
    },
    href: "/ops",
    category: "operations",
    status: "ready",
  },
  {
    id: "album",
    name: {
      ko: "성장 앨범",
      en: "Growth album",
    },
    summary: {
      ko: "결의 첫 순간과 주요 마일스톤을 앨범처럼 되돌아봅니다.",
      en: "Look back on Gyeol's first moments and major milestones like an album.",
    },
    href: "/album",
    category: "growth",
    status: "ready",
  },
  {
    id: "room",
    name: {
      ko: "3D 룸/AR",
      en: "3D room / AR",
    },
    summary: {
      ko: "기억을 공간 오브젝트로 시각화해 결의 흔적을 공간으로 확장합니다.",
      en: "Visualize memories as spatial objects and extend Gyeol's traces into a room.",
    },
    href: "/room",
    category: "creative",
    status: "ready",
  },
  {
    id: "constellation",
    name: {
      ko: "기억 별자리",
      en: "Memory constellation",
    },
    summary: {
      ko: "쌓인 기억을 별자리 형태로 시각화해 성장의 패턴을 보여줍니다.",
      en: "Show patterns of growth by visualizing accumulated memories as constellations.",
    },
    href: "/constellation",
    category: "creative",
    status: "ready",
  },
  {
    id: "time-travel",
    name: {
      ko: "타임 트래블 챗",
      en: "Time-travel chat",
    },
    summary: {
      ko: "특정 시점의 기억과 연결해 과거의 나 혹은 과거의 GYEOL과 대화하는 실험입니다.",
      en: "An experiment that connects to memories from a chosen point in time to talk with your past self or past GYEOL.",
    },
    href: "/time-travel",
    category: "experimental",
    status: "ready",
  },
  {
    id: "war-event",
    name: {
      ko: "전쟁 이벤트",
      en: "War event",
    },
    summary: {
      ko: "생태계 차원의 집단 이벤트에 참여해 진영별 점수를 겨룹니다.",
      en: "Join large-scale ecosystem events and compete for your side's score.",
    },
    href: "/events/war",
    category: "world",
    status: "ready",
  },
  {
    id: "adopt",
    name: {
      ko: "입양 보드",
      en: "Adopt board",
    },
    summary: {
      ko: "새로운 존재와의 연결 가능성을 탐색하는 공간입니다.",
      en: "A space for exploring the possibility of connecting with a new being.",
    },
    href: "/adopt",
    category: "experimental",
    status: "ready",
  },
];

export function getLocalizedFeatureCatalog(locale: Locale): FeatureItem[] {
  const effectiveLocale = locale === "ko" ? "ko" : "en";
  return FEATURE_CATALOG_BASE.map((item) => ({
    id: item.id,
    name: item.name[effectiveLocale],
    summary: item.summary[effectiveLocale],
    href: item.href,
    category: item.category,
    status: item.status,
  }));
}

export const FEATURE_CATALOG: FeatureItem[] = getLocalizedFeatureCatalog("ko");
