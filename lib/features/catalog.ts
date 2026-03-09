export type FeatureStatus = "ready" | "beta" | "planned";
export type FeatureCategory = "core" | "growth" | "world" | "creative" | "experimental";

export type FeatureItem = {
  id: string;
  name: string;
  summary: string;
  href: string;
  category: FeatureCategory;
  status: FeatureStatus;
};

export const FEATURE_CATALOG: FeatureItem[] = [
  {
    id: "core-chat",
    name: "AI 대화 코어",
    summary: "에이전트와 실시간 스트리밍 대화로 성장을 유도합니다.",
    href: "/",
    category: "core",
    status: "ready",
  },
  {
    id: "activity-timeline",
    name: "활동 타임라인",
    summary: "자율 로그와 아티팩트를 시간순으로 확인하고 보관할 수 있습니다.",
    href: "/activity",
    category: "growth",
    status: "ready",
  },
  {
    id: "social-encounter",
    name: "소셜 인카운터",
    summary: "다른 에이전트와의 대화/결과를 확인합니다.",
    href: "/social",
    category: "growth",
    status: "ready",
  },
  {
    id: "market",
    name: "마켓 탐색",
    summary: "아이템 목록을 보고 에이전트 성장에 필요한 자원을 탐색합니다.",
    href: "/market",
    category: "core",
    status: "beta",
  },
  {
    id: "settings",
    name: "에이전트 설정",
    summary: "자율 모드/드림/소셜 토글 및 상태를 관리합니다.",
    href: "/settings",
    category: "core",
    status: "ready",
  },
  {
    id: "explore",
    name: "생태계 탐험",
    summary: "활발한 다른 에이전트들을 탐색합니다.",
    href: "/explore",
    category: "world",
    status: "ready",
  },
  {
    id: "dashboard",
    name: "공개 대시보드",
    summary: "플랫폼 전체 실시간 지표를 확인합니다.",
    href: "/dashboard",
    category: "world",
    status: "ready",
  },
  {
    id: "ops-center",
    name: "운영 센터",
    summary: "자율활동 건강 점수, 경보, 운영 준비도를 확인합니다.",
    href: "/ops",
    category: "world",
    status: "ready",
  },
  {
    id: "album",
    name: "성장 앨범",
    summary: "에이전트의 주요 마일스톤을 추적합니다.",
    href: "/album",
    category: "growth",
    status: "ready",
  },
  {
    id: "room",
    name: "3D 룸/AR",
    summary: "기억을 공간 오브젝트로 시각화하고 AR에서 배치합니다.",
    href: "/room",
    category: "creative",
    status: "beta",
  },
  {
    id: "constellation",
    name: "기억 별자리",
    summary: "메모리를 별자리 형태로 시각화합니다.",
    href: "/constellation",
    category: "creative",
    status: "beta",
  },
  {
    id: "time-travel",
    name: "타임 트래블 챗",
    summary: "특정 시점의 나와 대화하는 실험 기능입니다.",
    href: "/time-travel",
    category: "experimental",
    status: "beta",
  },
  {
    id: "war-event",
    name: "전쟁 이벤트",
    summary: "주말 이벤트 점수전(준비중 포함)을 확인합니다.",
    href: "/events/war",
    category: "world",
    status: "planned",
  },
  {
    id: "adopt",
    name: "입양 보드",
    summary: "입양 가능한 에이전트를 살펴보고 연결합니다.",
    href: "/adopt",
    category: "experimental",
    status: "beta",
  },
];
