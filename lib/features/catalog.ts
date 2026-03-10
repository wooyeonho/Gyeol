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
    name: "AI 존재와의 대화",
    summary: "나만의 GYEOL과 실시간으로 대화하고, 그 대화가 기억과 관계의 출발점이 됩니다.",
    href: "/",
    category: "core",
    status: "ready",
  },
  {
    id: "activity-timeline",
    name: "활동 타임라인",
    summary: "결이 남긴 자율 로그와 생성 결과물을 시간순으로 확인합니다.",
    href: "/activity",
    category: "growth",
    status: "ready",
  },
  {
    id: "social-encounter",
    name: "소셜 인카운터",
    summary: "다른 존재와의 교류 흔적을 보며 결의 세계가 어떻게 확장되는지 확인합니다.",
    href: "/social",
    category: "growth",
    status: "ready",
  },
  {
    id: "market",
    name: "마켓 탐색",
    summary: "결의 성장과 생태계에 연결되는 아이템과 자원을 탐색합니다.",
    href: "/market",
    category: "core",
    status: "beta",
  },
  {
    id: "settings",
    name: "에이전트 설정",
    summary: "자율 모드, 드림, 소셜 같은 결의 생활 방식을 조정합니다.",
    href: "/settings",
    category: "core",
    status: "ready",
  },
  {
    id: "explore",
    name: "생태계 탐험",
    summary: "다른 사용자의 존재들이 어떤 이름과 성장 궤적을 갖는지 둘러봅니다.",
    href: "/explore",
    category: "world",
    status: "ready",
  },
  {
    id: "dashboard",
    name: "공개 대시보드",
    summary: "플랫폼 전체의 활동량과 자율성 건강 상태를 공개 지표로 확인합니다.",
    href: "/dashboard",
    category: "world",
    status: "ready",
  },
  {
    id: "ops-center",
    name: "운영 센터",
    summary: "운영자 관점에서 자율활동 건강 점수, 경보, 운영 준비도를 확인합니다.",
    href: "/ops",
    category: "world",
    status: "ready",
  },
  {
    id: "album",
    name: "성장 앨범",
    summary: "결의 첫 순간과 주요 마일스톤을 앨범처럼 되돌아봅니다.",
    href: "/album",
    category: "growth",
    status: "ready",
  },
  {
    id: "room",
    name: "3D 룸/AR",
    summary: "기억을 공간 오브젝트로 시각화해 결의 흔적을 공간으로 확장합니다.",
    href: "/room",
    category: "creative",
    status: "beta",
  },
  {
    id: "constellation",
    name: "기억 별자리",
    summary: "쌓인 기억을 별자리 형태로 시각화해 성장의 패턴을 보여줍니다.",
    href: "/constellation",
    category: "creative",
    status: "beta",
  },
  {
    id: "time-travel",
    name: "타임 트래블 챗",
    summary: "특정 시점의 기억과 연결해 과거의 나 혹은 과거의 GYEOL과 대화하는 실험입니다.",
    href: "/time-travel",
    category: "experimental",
    status: "beta",
  },
  {
    id: "war-event",
    name: "전쟁 이벤트",
    summary: "생태계 차원의 집단 이벤트를 위한 준비중 기능입니다.",
    href: "/events/war",
    category: "world",
    status: "planned",
  },
  {
    id: "adopt",
    name: "입양 보드",
    summary: "새로운 존재와의 연결 가능성을 탐색하는 베타 실험 공간입니다.",
    href: "/adopt",
    category: "experimental",
    status: "beta",
  },
];
