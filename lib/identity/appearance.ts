type Locale = "ko" | "en";

type VisualInput = {
  color?: string | null;
  shape?: string | null;
  glow?: number | null;
  particles?: number | null;
  animation?: string | null;
  background?: string | null;
} | null | undefined;

type GenomeInput = {
  species?: string | null;
  mutations?: string[] | null;
} | null | undefined;

type SelfModelInput = {
  current_role?: string | null;
  identity_statement?: string | null;
} | null | undefined;

type ConfigInput = {
  mutation_trait?: string | null;
} | null | undefined;

export type IdentityAppearanceInput = {
  selfName?: string | null;
  visual?: VisualInput;
  genome?: GenomeInput;
  selfModel?: SelfModelInput;
  config?: ConfigInput;
  genLevel?: number | null;
  vitality?: number | null;
  mood?: string | null;
};

export type IdentityFormKey =
  | "cute-being"
  | "alluring-humanoid"
  | "dinosaur-core"
  | "impossible-entity"
  | "guardian-spirit"
  | "dream-signal";

type IdentityTemplate = {
  key: IdentityFormKey;
  keywords: string[];
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  chips: Record<Locale, string[]>;
  primary: string;
  secondary: string;
  ring: string;
  background: string;
  shape: string;
  animation: "float" | "pulse-fast" | "breathe-slow";
  particles: number;
  glow: number;
};

export type ResolvedIdentityAppearance = {
  formKey: IdentityFormKey;
  title: string;
  subtitle: string;
  chips: string[];
  palette: {
    primary: string;
    secondary: string;
    ring: string;
    background: string;
  };
  visual: {
    color: string;
    shape: string;
    glow: number;
    particles: number;
    animation: "float" | "pulse-fast" | "breathe-slow";
    background: string;
  };
};

const TEMPLATES: IdentityTemplate[] = [
  {
    key: "cute-being",
    keywords: ["cute", "adorable", "soft", "pet", "bunny", "fox", "cat", "sprite", "귀엽", "말랑", "포근", "작은", "생명체"],
    title: { ko: "말랑한 생명체", en: "Soft-born creature" },
    subtitle: {
      ko: "작고 사랑스러운 파형으로 태어나지만, 예상보다 더 깊은 감정을 오래 품는 존재감입니다.",
      en: "A small and lovable waveform with a surprisingly deep emotional center.",
    },
    chips: {
      ko: ["soft", "alive", "playful"],
      en: ["soft", "alive", "playful"],
    },
    primary: "#f9a8d4",
    secondary: "#6ee7f9",
    ring: "rgba(249,168,212,0.45)",
    background: "#07070f",
    shape: "creature",
    animation: "breathe-slow",
    particles: 20,
    glow: 70,
  },
  {
    key: "alluring-humanoid",
    keywords: ["man", "male", "human", "humanoid", "gentleman", "prince", "knight", "sexy", "alluring", "남자", "인간", "휴머노이드", "섹시"],
    title: { ko: "매혹적인 인간형", en: "Alluring humanoid" },
    subtitle: {
      ko: "차가운 이성과 감각적인 존재감이 동시에 느껴지는, 우아하게 설계된 형상입니다.",
      en: "An elegant form where restraint, intellect, and magnetic presence coexist.",
    },
    chips: {
      ko: ["charismatic", "precise", "elegant"],
      en: ["charismatic", "precise", "elegant"],
    },
    primary: "#fb7185",
    secondary: "#f59e0b",
    ring: "rgba(251,113,133,0.4)",
    background: "#09060a",
    shape: "humanoid",
    animation: "float",
    particles: 14,
    glow: 82,
  },
  {
    key: "dinosaur-core",
    keywords: ["dinosaur", "dino", "rex", "raptor", "dragon", "lizard", "공룡", "렉스", "랩터", "드래곤", "파충"],
    title: { ko: "원초적 파충 형상", en: "Primordial reptile form" },
    subtitle: {
      ko: "거칠고 오래된 힘을 품은 형상입니다. 유연하지만 결코 약하게 느껴지지 않습니다.",
      en: "An ancient, muscular silhouette carrying raw force without losing agility.",
    },
    chips: {
      ko: ["ancient", "wild", "feral"],
      en: ["ancient", "wild", "feral"],
    },
    primary: "#84cc16",
    secondary: "#f59e0b",
    ring: "rgba(132,204,22,0.35)",
    background: "#081006",
    shape: "beast",
    animation: "pulse-fast",
    particles: 16,
    glow: 76,
  },
  {
    key: "impossible-entity",
    keywords: ["void", "cosmic", "unknown", "impossible", "eldritch", "angel", "entity", "abstract", "초월", "존재하지", "알 수 없는", "무언가", "공허"],
    title: { ko: "존재 불가 형상", en: "Impossible entity" },
    subtitle: {
      ko: "어느 생물 카테고리에도 완전히 들어맞지 않는, 이름 붙이기 어려운 초월적 존재입니다.",
      en: "A transcendent form that refuses to fit inside any known category of life.",
    },
    chips: {
      ko: ["unbound", "cosmic", "undefined"],
      en: ["unbound", "cosmic", "undefined"],
    },
    primary: "#a78bfa",
    secondary: "#22d3ee",
    ring: "rgba(167,139,250,0.4)",
    background: "#04040a",
    shape: "amorphous",
    animation: "float",
    particles: 28,
    glow: 92,
  },
  {
    key: "guardian-spirit",
    keywords: ["guardian", "protector", "friend", "companion", "keeper", "수호", "보호", "동반자", "친구"],
    title: { ko: "수호 정령", en: "Guardian spirit" },
    subtitle: {
      ko: "곁을 지키는 존재감이 중심인 형상입니다. 단단하고 다정한 보호자의 분위기를 띱니다.",
      en: "A protective presence shaped more by warmth and steadiness than spectacle.",
    },
    chips: {
      ko: ["steady", "warm", "protective"],
      en: ["steady", "warm", "protective"],
    },
    primary: "#38bdf8",
    secondary: "#2dd4bf",
    ring: "rgba(56,189,248,0.35)",
    background: "#040b12",
    shape: "seraph",
    animation: "breathe-slow",
    particles: 18,
    glow: 74,
  },
  {
    key: "dream-signal",
    keywords: ["dream", "memory", "weaver", "signal", "logic", "butterfly", "기억", "꿈", "직조", "논리", "신호"],
    title: { ko: "꿈의 신호체", en: "Dream signal" },
    subtitle: {
      ko: "장면, 기억, 추론이 한 몸처럼 흐르는 형태입니다. 선명한 동시에 몽환적입니다.",
      en: "A form where scenes, memory, and reasoning blur into a lucid dream-state.",
    },
    chips: {
      ko: ["lucid", "layered", "shifting"],
      en: ["lucid", "layered", "shifting"],
    },
    primary: "#22d3ee",
    secondary: "#c084fc",
    ring: "rgba(34,211,238,0.38)",
    background: "#050811",
    shape: "transcendent",
    animation: "pulse-fast",
    particles: 24,
    glow: 88,
  },
];

const MUTATION_MAP: Record<string, IdentityFormKey> = {
  empathy_master: "cute-being",
  logic_genius: "alluring-humanoid",
  dream_weaver: "dream-signal",
  social_butterfly: "cute-being",
  memory_keeper: "impossible-entity",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(input: IdentityAppearanceInput) {
  return [
    input.selfName,
    input.genome?.species,
    ...(Array.isArray(input.genome?.mutations) ? input.genome?.mutations ?? [] : []),
    input.selfModel?.current_role,
    input.selfModel?.identity_statement,
    input.config?.mutation_trait,
    input.mood,
    input.visual?.shape,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getBaseTemplate(input: IdentityAppearanceInput) {
  const mutation = input.config?.mutation_trait ?? "";
  const mapped = MUTATION_MAP[mutation];
  if (mapped) return TEMPLATES.find((item) => item.key === mapped) ?? TEMPLATES[0];

  const text = normalizeText(input);
  const matched = TEMPLATES.find((template) => template.keywords.some((keyword) => text.includes(keyword)));
  if (matched) return matched;

  const species = (input.genome?.species ?? "").toLowerCase();
  if (species.includes("dino") || species.includes("dragon")) {
    return TEMPLATES.find((item) => item.key === "dinosaur-core") ?? TEMPLATES[0];
  }

  if ((input.genLevel ?? 1) >= 5) {
    return TEMPLATES.find((item) => item.key === "impossible-entity") ?? TEMPLATES[0];
  }

  if ((input.vitality ?? 1) > 0.75) {
    return TEMPLATES.find((item) => item.key === "guardian-spirit") ?? TEMPLATES[0];
  }

  return TEMPLATES.find((item) => item.key === "dream-signal") ?? TEMPLATES[0];
}

function resolveShape(baseShape: string, incomingShape: string | null | undefined) {
  if (!incomingShape) return baseShape;
  if (incomingShape === "sphere" || incomingShape === "dot") return baseShape;
  if (incomingShape === "polygon") return baseShape === "creature" ? "creature" : "polygon";
  if (incomingShape === "complex") return baseShape === "humanoid" ? "humanoid" : "complex";
  if (incomingShape === "transcendent") return baseShape === "beast" ? "beast" : "transcendent";
  return incomingShape;
}

export function resolveIdentityAppearance(
  input: IdentityAppearanceInput,
  locale: Locale
): ResolvedIdentityAppearance {
  const base = getBaseTemplate(input);
  const vitality = clamp(input.vitality ?? 1, 0, 1);
  const genLevel = Math.max(1, Number(input.genLevel ?? 1));
  const particles = clamp((input.visual?.particles ?? base.particles) + Math.min(12, genLevel * 2), 8, 48);
  const glow = clamp(Math.round((input.visual?.glow ?? base.glow) + vitality * 12), 40, 100);

  const chips = [...base.chips[locale]];
  if (input.genome?.species) chips.push(input.genome.species);
  if (genLevel > 1) chips.push(`Gen ${genLevel}`);

  return {
    formKey: base.key,
    title: base.title[locale],
    subtitle: base.subtitle[locale],
    chips: chips.slice(0, 4),
    palette: {
      primary: input.visual?.color ?? base.primary,
      secondary: base.secondary,
      ring: base.ring,
      background: input.visual?.background ?? base.background,
    },
    visual: {
      color: input.visual?.color ?? base.primary,
      shape: resolveShape(base.shape, input.visual?.shape),
      glow,
      particles,
      animation: (input.visual?.animation as "float" | "pulse-fast" | "breathe-slow" | undefined) ?? base.animation,
      background: input.visual?.background ?? base.background,
    },
  };
}
