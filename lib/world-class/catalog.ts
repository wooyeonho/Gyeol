/**
 * Shared catalog of world-class inspirations — single source of truth
 * consumed by:
 *   — app/world-class/page.tsx            (20 axes showcase)
 *   — app/world-class/inspirations/...    (filterable apps grid)
 *   — app/world-class/trends/...          (7 trend source tabs)
 *   — components/inspiration-of-the-day.tsx (home banner rotator)
 *
 * Editing this file updates every visible surface at once — that's the whole
 * point of having a single catalog rather than sprinkling data in components.
 *
 * Companion docs:
 *   WORLD_CLASS_APPS_RESEARCH.md   — 20 axes research
 *   TRENDING_2025_RESEARCH.md      — 7 trend sources
 */

export type AxisId =
  | "design"
  | "revenue"
  | "features"
  | "security"
  | "social"
  | "content"
  | "ai-native"
  | "gaming"
  | "audio"
  | "fintech"
  | "devtools"
  | "wellness"
  | "learning"
  | "travel"
  | "productivity"
  | "creative"
  | "community"
  | "reader"
  | "commerce"
  | "messaging";

export type TrendSource =
  | "twitter-x"
  | "reddit"
  | "github"
  | "product-hunt"
  | "hacker-news"
  | "awwwards"
  | "apple-design-awards"
  | "google-play-best";

export type Axis = {
  id: AxisId;
  label: string;
  tagline: string;
  /** The playbook file (relative path) this axis maps to. */
  playbook: string;
  /** Where this axis lives in the research doc. */
  researchAnchor: string;
};

export const AXES: readonly Axis[] = [
  {
    id: "design",
    label: "디자인",
    tagline: "스프링 물리, 타이포, 브리딩, 여백",
    playbook: "lib/design/world-class-playbook.ts",
    researchAnchor: "#1-디자인-최고-앱-top-10--강점-추출",
  },
  {
    id: "revenue",
    label: "수익",
    tagline: "연간 할인, 번들, 가족 플랜, 피티",
    playbook: "lib/revenue/world-class-monetization.ts",
    researchAnchor: "#2-수익-최고-앱-top-10--강점-추출",
  },
  {
    id: "features",
    label: "기능",
    tagline: "슬래시 커맨드, 분기 대화, 스니펫",
    playbook: "lib/features/world-class-patterns.ts",
    researchAnchor: "#3-기능-최고-앱-top-10--강점-추출",
  },
  {
    id: "security",
    label: "보안",
    tagline: "어댑티브 MFA, E2E, 로컬 KDF, 잠금 모드",
    playbook: "lib/security/world-class-defense.ts",
    researchAnchor: "#4-보안-최고-앱-top-10--강점-추출",
  },
  {
    id: "social",
    label: "소셜",
    tagline: "피드 중력, 스토리 레이어, 데일리 프롬프트",
    playbook: "lib/social/world-class-social.ts",
    researchAnchor: "#4½1-소셜-social",
  },
  {
    id: "content",
    label: "컨텐츠",
    tagline: "이어보기, 데일리 믹스, 에디토리얼",
    playbook: "lib/content/world-class-content.ts",
    researchAnchor: "#4½2-컨텐츠--미디어-content",
  },
  {
    id: "ai-native",
    label: "AI 네이티브",
    tagline: "아티팩트, 인용, 인라인 편집",
    playbook: "lib/ai-native/world-class-ai-native.ts",
    researchAnchor: "#4½3-ai-네이티브-ai-native",
  },
  {
    id: "gaming",
    label: "게이밍",
    tagline: "시즌 패스, 피티 가챠, 데일리 리셋",
    playbook: "lib/gaming/world-class-liveops.ts",
    researchAnchor: "#4½4-게이밍--라이브옵스-gaming",
  },
  {
    id: "audio",
    label: "음성",
    tagline: "라이브 스테이지, 스마트 스피드, 파형",
    playbook: "lib/audio/world-class-voice.ts",
    researchAnchor: "#4½5-음성--오디오-audio",
  },
  {
    id: "fintech",
    label: "금융",
    tagline: "원-탭, 투명 환율, 에스크로",
    playbook: "lib/fintech/world-class-fintech.ts",
    researchAnchor: "#4½6-금융--결제-fintech",
  },
  {
    id: "devtools",
    label: "개발자 도구",
    tagline: "프리뷰 URL, 인라인 AI 편집, 커맨드",
    playbook: "lib/devtools/world-class-dx.ts",
    researchAnchor: "#4½7-개발자-도구-devtools",
  },
  {
    id: "wellness",
    label: "헬스",
    tagline: "3링, 호흡, 회복 스코어, 젠틀 스트릭",
    playbook: "lib/wellness/world-class-wellness.ts",
    researchAnchor: "#4½8-헬스--웰니스-wellness",
  },
  {
    id: "learning",
    label: "학습",
    tagline: "SM-2 간격반복, 마스터리, 소크라테스",
    playbook: "lib/learning/world-class-learning.ts",
    researchAnchor: "#4½9-교육--학습-learning",
  },
  {
    id: "travel",
    label: "여행",
    tagline: "로컬 피드, ETA, 가격 예측",
    playbook: "lib/travel/world-class-travel.ts",
    researchAnchor: "#4½10-여행--로컬-travel--local",
  },
  {
    id: "productivity",
    label: "생산성",
    tagline: "블록, 사이클, 자연어 입력",
    playbook: "lib/productivity/world-class-productivity.ts",
    researchAnchor: "#4½11-생산성--협업-productivity",
  },
  {
    id: "creative",
    label: "크리에이티브",
    tagline: "압력 브러시, 매그네틱 타임라인, 벡터 협업",
    playbook: "lib/creative/world-class-creative.ts",
    researchAnchor: "#4½12-크리에이티브-툴-creative",
  },
  {
    id: "community",
    label: "커뮤니티",
    tagline: "HN 랭킹, 레퓨테이션, 서브 룸",
    playbook: "lib/community/world-class-community.ts",
    researchAnchor: "#4½13-커뮤니티--포럼-community",
  },
  {
    id: "reader",
    label: "리더",
    tagline: "TL;DR, 하이라이트 회상, 리더 뷰",
    playbook: "lib/reader/world-class-reader.ts",
    researchAnchor: "#4½14-뉴스--리더-reader",
  },
  {
    id: "commerce",
    label: "커머스",
    tagline: "1-클릭, 체크아웃, 무료 배송 넛지",
    playbook: "lib/commerce/world-class-commerce.ts",
    researchAnchor: "#4½15-쇼핑--커머스-commerce",
  },
  {
    id: "messaging",
    label: "메시징",
    tagline: "메시지 이펙트, 탭백, 디스어피어 타이머",
    playbook: "lib/messaging/world-class-messaging.ts",
    researchAnchor: "#4½16-메시징-messaging",
  },
];

/* ── Inspirations catalog ─────────────────────────────────────────────── */

export type Inspiration = {
  id: string;
  name: string;
  axis: AxisId;
  oneLine: string;
  adoptedAs: string;
  sources: readonly TrendSource[];
};

export const INSPIRATIONS: readonly Inspiration[] = [
  /* design */
  { id: "apple-hig", name: "Apple HIG", axis: "design", oneLine: "스프링 물리와 44pt 터치 타겟", adoptedAs: "lib/design/world-class-playbook.ts: physical-motion", sources: ["apple-design-awards"] },
  { id: "linear", name: "Linear", axis: "design", oneLine: "키보드 우선, 커맨드 팔레트", adoptedAs: "keyboard-first density", sources: ["twitter-x", "product-hunt"] },
  { id: "figma", name: "Figma", axis: "design", oneLine: "무한 캔버스 + 라이브 커서", adoptedAs: "live-cursor presence", sources: ["twitter-x"] },
  { id: "notion", name: "Notion", axis: "design", oneLine: "블록 + 슬래시 커맨드", adoptedAs: "notion-slash", sources: ["twitter-x", "reddit"] },
  { id: "arc", name: "Arc Browser", axis: "design", oneLine: "리퀴드 공간 전환", adoptedAs: "liquid-space", sources: ["twitter-x", "awwwards"] },
  { id: "stripe", name: "Stripe", axis: "design", oneLine: "정밀한 엘리베이션과 숫자", adoptedAs: "precise-elevation", sources: ["awwwards"] },
  { id: "robinhood", name: "Robinhood", axis: "design", oneLine: "수치 극장", adoptedAs: "number-theatre", sources: [] },
  { id: "airbnb", name: "Airbnb", axis: "design", oneLine: "따뜻한 이미지 우선", adoptedAs: "image-first-warmth", sources: [] },
  { id: "procreate", name: "Procreate Dreams", axis: "design", oneLine: "제스처 기반 애니 타임라인", adoptedAs: "pressure-brush + timeline", sources: ["apple-design-awards"] },
  { id: "calm", name: "Calm", axis: "design", oneLine: "호흡 + 사운드 디자인", adoptedAs: "breath-loop", sources: ["google-play-best"] },

  /* revenue */
  { id: "spotify-family", name: "Spotify Family", axis: "revenue", oneLine: "가족 좌석, 연간 할인", adoptedAs: "seats + annualSavingsPct", sources: [] },
  { id: "genshin-pity", name: "Genshin Impact", axis: "revenue", oneLine: "가챠 소프트 피티", adoptedAs: "liveops: pityDropChance", sources: [] },
  { id: "duo-streak", name: "Duolingo", axis: "revenue", oneLine: "스트릭 + 스트릭 프리즈", adoptedAs: "updateStreakWithFreeze", sources: ["google-play-best"] },
  { id: "tinder-boost", name: "Tinder Boost", axis: "revenue", oneLine: "순간 가치 소액결제", adoptedAs: "paywall-triggers", sources: [] },
  { id: "patreon", name: "Patreon", axis: "revenue", oneLine: "팬 티어 구독", adoptedAs: "creator share", sources: [] },

  /* features */
  { id: "chatgpt-gpt", name: "ChatGPT GPTs", axis: "features", oneLine: "커스텀 인스트럭션 + 툴", adoptedAs: "ai-native: custom-instructions", sources: ["product-hunt", "twitter-x"] },
  { id: "raycast", name: "Raycast", axis: "features", oneLine: "인라인 결과 커맨드", adoptedAs: "devtools: global-command", sources: ["product-hunt", "twitter-x"] },
  { id: "cursor", name: "Cursor", axis: "ai-native", oneLine: "AI 탭 자동완성", adoptedAs: "inlineSuggestion state machine", sources: ["twitter-x", "product-hunt", "hacker-news"] },
  { id: "claude-artifacts", name: "Claude Artifacts", axis: "ai-native", oneLine: "사이드 패널 결과", adoptedAs: "artifact-panel", sources: ["twitter-x", "product-hunt"] },
  { id: "perplexity-pages", name: "Perplexity Pages", axis: "ai-native", oneLine: "인용 기반 Pages", adoptedAs: "linkCitations", sources: ["twitter-x"] },
  { id: "bolt-new", name: "Bolt.new", axis: "ai-native", oneLine: "프롬프트 → 풀스택", adoptedAs: "prompt-to-run", sources: ["twitter-x", "product-hunt"] },
  { id: "v0", name: "v0 by Vercel", axis: "ai-native", oneLine: "프롬프트 → UI", adoptedAs: "prompt-to-run", sources: ["twitter-x", "product-hunt"] },
  { id: "arc-search", name: "Arc Search", axis: "ai-native", oneLine: "검색 → 합성 요약", adoptedAs: "search-then-browse", sources: ["twitter-x", "product-hunt"] },
  { id: "granola", name: "Granola", axis: "ai-native", oneLine: "자동 회의 노트", adoptedAs: "auto-notetaking", sources: ["twitter-x", "product-hunt"] },
  { id: "character-ai", name: "Character.AI", axis: "ai-native", oneLine: "캐릭터 세션 기억", adoptedAs: "character-persistence", sources: ["google-play-best"] },
  { id: "pi", name: "Pi (Inflection)", axis: "ai-native", oneLine: "프로액티브 체크인", adoptedAs: "proactive-starter", sources: [] },

  /* security */
  { id: "signal", name: "Signal", axis: "security", oneLine: "E2E 메시징 + 최소 메타", adoptedAs: "e2e + minimal-meta", sources: [] },
  { id: "1password", name: "1Password", axis: "security", oneLine: "Secret Key + 로컬 KDF", adoptedAs: "client-kdf", sources: [] },
  { id: "cloudflare", name: "Cloudflare", axis: "security", oneLine: "엣지 WAF + 봇 방어", adoptedAs: "edge middleware rate-limit", sources: [] },
  { id: "okta", name: "Okta / Auth0", axis: "security", oneLine: "어댑티브 리스크 점수", adoptedAs: "adaptive MFA", sources: [] },
  { id: "lockdown-mode", name: "Apple Lockdown", axis: "security", oneLine: "공격 표면 최소화", adoptedAs: "lockdown profile", sources: [] },

  /* social */
  { id: "tiktok-fyp", name: "TikTok For You", axis: "social", oneLine: "피드 중력", adoptedAs: "rankFeed('for-you')", sources: [] },
  { id: "threads", name: "Threads", axis: "social", oneLine: "리플 우선 타임라인", adoptedAs: "reply-first", sources: [] },
  { id: "bereal", name: "BeReal", axis: "social", oneLine: "데일리 강제 프롬프트", adoptedAs: "dailyPromptWindowStart", sources: [] },
  { id: "bluesky", name: "Bluesky", axis: "social", oneLine: "커스텀 피드 레시피", adoptedAs: "FEED_RECIPES", sources: ["twitter-x"] },
  { id: "ig-stories", name: "Instagram Stories", axis: "social", oneLine: "스토리 레이어", adoptedAs: "story-layer", sources: [] },
  { id: "pinterest-board", name: "Pinterest", axis: "social", oneLine: "관심 기반 보드", adoptedAs: "curated-board", sources: [] },

  /* content */
  { id: "netflix-resume", name: "Netflix", axis: "content", oneLine: "이어보기 히어로", adoptedAs: "continueWatching", sources: [] },
  { id: "spotify-mix", name: "Spotify Daily Mix", axis: "content", oneLine: "새벽 합성 데일리 믹스", adoptedAs: "dailyMix", sources: [] },
  { id: "youtube-shorts", name: "YouTube Shorts", axis: "content", oneLine: "길이 가변 피드", adoptedAs: "length-variable", sources: [] },
  { id: "twitch-overlay", name: "Twitch", axis: "content", oneLine: "라이브 채팅 오버레이", adoptedAs: "live-overlay", sources: [] },

  /* gaming */
  { id: "fortnite-arc", name: "Fortnite", axis: "gaming", oneLine: "시즌 아크 라이브 이벤트", adoptedAs: "season-arc", sources: [] },
  { id: "pokemon-go", name: "Pokemon GO", axis: "gaming", oneLine: "로케이션 이벤트", adoptedAs: "location-event", sources: [] },
  { id: "animal-crossing", name: "Animal Crossing", axis: "gaming", oneLine: "실시간 시뮬레이션", adoptedAs: "real-time-sim", sources: [] },

  /* audio */
  { id: "discord-stage", name: "Discord Stage", axis: "audio", oneLine: "라이브 스테이지 + 역할", adoptedAs: "promoteRole/demoteRole", sources: [] },
  { id: "overcast", name: "Overcast", axis: "audio", oneLine: "스마트 스피드", adoptedAs: "smartSpeedDuration", sources: [] },
  { id: "voice-memos", name: "Voice Memos", axis: "audio", oneLine: "인라인 파형", adoptedAs: "waveformPeaks", sources: [] },
  { id: "airchat", name: "Airchat", axis: "audio", oneLine: "음성 기반 피드", adoptedAs: "voice-first-feed", sources: ["twitter-x"] },

  /* fintech */
  { id: "toss", name: "Toss", axis: "fintech", oneLine: "원-탭 송금 UX", adoptedAs: "one-tap-transfer", sources: [] },
  { id: "wise", name: "Wise", axis: "fintech", oneLine: "투명 중간환율", adoptedAs: "spreadPct + spreadGrade", sources: [] },
  { id: "stripe-dash", name: "Stripe Dashboard", axis: "fintech", oneLine: "개발자 톤 대시보드", adoptedAs: "developer-dashboard", sources: [] },
  { id: "revolut", name: "Revolut", axis: "fintech", oneLine: "다통화 지갑", adoptedAs: "multi-currency-wallet", sources: [] },

  /* devtools */
  { id: "vercel-preview", name: "Vercel Preview URL", axis: "devtools", oneLine: "PR별 미리보기 URL", adoptedAs: "previewUrl", sources: ["twitter-x"] },
  { id: "warp", name: "Warp Terminal", axis: "devtools", oneLine: "AI 터미널", adoptedAs: "ai-terminal", sources: ["hacker-news"] },
  { id: "zed", name: "Zed Editor", axis: "devtools", oneLine: "러스트 콜라보 에디터", adoptedAs: "collab-editor", sources: ["hacker-news", "github"] },
  { id: "supabase", name: "Supabase", axis: "devtools", oneLine: "투명 BaaS 인스펙터", adoptedAs: "transparent-baas", sources: ["github"] },
  { id: "turso", name: "Turso / libSQL", axis: "devtools", oneLine: "엣지 SQLite 동기", adoptedAs: "edge-sql", sources: ["hacker-news"] },

  /* wellness */
  { id: "apple-health", name: "Apple Health", axis: "wellness", oneLine: "3링 시각화", adoptedAs: "ringCompletion", sources: [] },
  { id: "whoop", name: "Whoop", axis: "wellness", oneLine: "회복 스코어", adoptedAs: "recoveryScore", sources: [] },
  { id: "oura", name: "Oura Ring", axis: "wellness", oneLine: "수면 링", adoptedAs: "sleep-ring", sources: [] },
  { id: "headspace", name: "Headspace", axis: "wellness", oneLine: "호흡 가이드", adoptedAs: "BREATH_CADENCES", sources: ["google-play-best"] },
  { id: "finch", name: "Finch", axis: "wellness", oneLine: "셀프케어 캐릭터", adoptedAs: "self-care-character", sources: [] },

  /* learning */
  { id: "anki", name: "Anki", axis: "learning", oneLine: "간격 반복 SRS", adoptedAs: "reviewCard", sources: [] },
  { id: "duolingo", name: "Duolingo", axis: "learning", oneLine: "스트릭 게이미피케이션", adoptedAs: "updateStreakWithFreeze", sources: ["google-play-best"] },
  { id: "khanmigo", name: "Khanmigo", axis: "learning", oneLine: "AI 소크라테스", adoptedAs: "nextSocraticState", sources: [] },
  { id: "readwise", name: "Readwise Reader", axis: "learning", oneLine: "하이라이트 회수", adoptedAs: "pickDailyRecall", sources: [] },

  /* travel */
  { id: "daangn", name: "당근 Daangn", axis: "travel", oneLine: "하이퍼로컬 피드", adoptedAs: "hyperlocal-feed", sources: [] },
  { id: "airbnb-host", name: "Airbnb", axis: "travel", oneLine: "호스트 내러티브", adoptedAs: "host-narrative", sources: [] },
  { id: "hopper", name: "Hopper", axis: "travel", oneLine: "가격 예측", adoptedAs: "pricePrediction", sources: [] },

  /* productivity */
  { id: "notion-blocks", name: "Notion", axis: "productivity", oneLine: "블록 에브리띵", adoptedAs: "block-everything", sources: [] },
  { id: "linear-cycles", name: "Linear", axis: "productivity", oneLine: "사이클 롤오버", adoptedAs: "rollCycle", sources: [] },
  { id: "things3", name: "Things 3", axis: "productivity", oneLine: "자연어 입력", adoptedAs: "parseNaturalDate", sources: [] },
  { id: "loom", name: "Loom", axis: "productivity", oneLine: "비동기 비디오", adoptedAs: "async-video", sources: [] },

  /* creative */
  { id: "procreate-dreams", name: "Procreate Dreams", axis: "creative", oneLine: "압력 브러시 + 타임라인", adoptedAs: "pressureCurve + collapseGap", sources: ["apple-design-awards"] },
  { id: "figma-vector", name: "Figma", axis: "creative", oneLine: "벡터 협업", adoptedAs: "vector-coop", sources: [] },
  { id: "capcut", name: "Capcut", axis: "creative", oneLine: "소셜 편집 프리셋", adoptedAs: "SOCIAL_ASPECT_RATIOS", sources: [] },
  { id: "pixelmator-pro", name: "Pixelmator Pro", axis: "creative", oneLine: "ML 원탭 편집", adoptedAs: "ml-edit", sources: [] },

  /* community */
  { id: "reddit-subs", name: "Reddit", axis: "community", oneLine: "서브 커뮤니티", adoptedAs: "subs", sources: ["reddit"] },
  { id: "hn-rank", name: "Hacker News", axis: "community", oneLine: "시간감쇠 랭킹", adoptedAs: "hnScore + rankPosts", sources: ["hacker-news"] },
  { id: "discord-server", name: "Discord", axis: "community", oneLine: "서버 + 룸", adoptedAs: "server-rooms", sources: [] },

  /* reader */
  { id: "readwise-recall", name: "Readwise Reader", axis: "reader", oneLine: "하이라이트 TTS 회상", adoptedAs: "pickDailyRecall + dueHighlights", sources: [] },
  { id: "arc-search-read", name: "Arc Search", axis: "reader", oneLine: "TL;DR 카드", adoptedAs: "extractTldr", sources: ["twitter-x"] },
  { id: "apple-news", name: "Apple News", axis: "reader", oneLine: "에디터 큐레이션", adoptedAs: "editor-curation", sources: [] },

  /* commerce */
  { id: "amazon-one-click", name: "Amazon 1-Click", axis: "commerce", oneLine: "원클릭 구매", adoptedAs: "one-click", sources: [] },
  { id: "coupang-rocket", name: "Coupang 로켓", axis: "commerce", oneLine: "당일 배송 약속", adoptedAs: "rocket-delivery", sources: [] },
  { id: "musinsa", name: "무신사", axis: "commerce", oneLine: "룩북 큐레이션", adoptedAs: "lookbook-curation", sources: [] },
  { id: "stockx", name: "StockX", axis: "commerce", oneLine: "리셀 가격 그래프", adoptedAs: "priceTrend", sources: [] },

  /* messaging */
  { id: "imessage-effects", name: "iMessage Effects", axis: "messaging", oneLine: "메시지 도착 이펙트", adoptedAs: "MESSAGE_EFFECTS", sources: [] },
  { id: "telegram-bots", name: "Telegram Bots", axis: "messaging", oneLine: "봇 생태계", adoptedAs: "extractMentions", sources: [] },
  { id: "kakaotalk-stickers", name: "KakaoTalk 이모티콘", axis: "messaging", oneLine: "스티커 이코노미", adoptedAs: "sticker-economy", sources: [] },
  { id: "signal-disappear", name: "Signal Disappearing", axis: "messaging", oneLine: "자동 소멸", adoptedAs: "isExpired", sources: [] },
  { id: "wechat", name: "WeChat", axis: "messaging", oneLine: "슈퍼앱 미니앱", adoptedAs: "super-app", sources: [] },
];

/* ── Helpers used by pages ───────────────────────────────────────────── */

export function inspirationsByAxis(axis: AxisId): Inspiration[] {
  return INSPIRATIONS.filter((i) => i.axis === axis);
}

export function inspirationsBySource(source: TrendSource): Inspiration[] {
  return INSPIRATIONS.filter((i) => i.sources.includes(source));
}

/**
 * Deterministic "inspiration of the day" picker.
 * Pure: same day → same inspiration. Used by the home banner.
 */
export function inspirationOfTheDay(dayKey: string): Inspiration {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % INSPIRATIONS.length;
  return INSPIRATIONS[idx];
}

export const TREND_SOURCES: readonly { id: TrendSource; label: string; url: string }[] = [
  { id: "twitter-x", label: "X (Twitter)", url: "https://x.com" },
  { id: "reddit", label: "Reddit", url: "https://reddit.com" },
  { id: "github", label: "GitHub Trending", url: "https://github.com/trending" },
  { id: "product-hunt", label: "Product Hunt", url: "https://producthunt.com" },
  { id: "hacker-news", label: "Hacker News", url: "https://news.ycombinator.com" },
  { id: "awwwards", label: "Awwwards", url: "https://awwwards.com" },
  { id: "apple-design-awards", label: "Apple Design Awards", url: "https://developer.apple.com/design/awards" },
  { id: "google-play-best", label: "Google Play Best of", url: "https://play.google.com" },
];
