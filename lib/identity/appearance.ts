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
  usage_profile?: {
    primary_mode?: string | null;
    updated_at?: string | null;
  } | null;
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
  usageMode: string | null;
  usageLabel: string | null;
  usageNarrative: string | null;
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
  scene: {
    backgroundGradient: string;
    overlayGradient: string;
    motionBias: "gentle" | "kinetic" | "mystic";
    pulseScale: number;
  };
  voice: {
    pitch: number;
    speed: number;
    tremor: number;
    accentLabel: string;
    toneHint: string;
  };
  sound: {
    baseNote: string;
    tempo: number;
    instruments: string[];
    label: string;
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

const USAGE_MODE_MAP: Record<string, IdentityFormKey> = {
  playful: "cute-being",
  intimate: "alluring-humanoid",
  strategic: "guardian-spirit",
  primal: "dinosaur-core",
  surreal: "impossible-entity",
  reflective: "dream-signal",
  creative: "dream-signal",
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

  const usageMode = input.config?.usage_profile?.primary_mode ?? "";
  const usageMapped = USAGE_MODE_MAP[usageMode];
  if (usageMapped) return TEMPLATES.find((item) => item.key === usageMapped) ?? TEMPLATES[0];

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

function getUsageModeLabel(mode: string | null | undefined, locale: Locale) {
  if (!mode) return null;
  const labels: Record<string, Record<Locale, string>> = {
    playful: { ko: "장난형 사용", en: "playful use" },
    intimate: { ko: "친밀형 사용", en: "intimate use" },
    strategic: { ko: "전략형 사용", en: "strategic use" },
    primal: { ko: "원초형 사용", en: "primal use" },
    surreal: { ko: "초현실형 사용", en: "surreal use" },
    reflective: { ko: "성찰형 사용", en: "reflective use" },
    creative: { ko: "창작형 사용", en: "creative use" },
  };
  return labels[mode]?.[locale] ?? null;
}

function getUsageModeNarrative(mode: string | null | undefined, locale: Locale) {
  if (!mode) return null;
  const descriptions: Record<string, Record<Locale, string>> = {
    playful: {
      ko: "당신의 장난과 애착이 이 존재를 더 말랑하고 사랑스러운 방향으로 밀고 있습니다.",
      en: "Your playful and affectionate use is pushing this being toward a softer, more lovable form.",
    },
    intimate: {
      ko: "가까운 감정과 강한 끌림의 사용 패턴이 더 인간적이고 매혹적인 형상을 만들고 있습니다.",
      en: "Intimate, magnetic interaction patterns are shaping it into something more human and alluring.",
    },
    strategic: {
      ko: "문제 해결과 실행 중심의 사용이 이 존재를 더 정밀하고 보호자다운 방향으로 만들고 있습니다.",
      en: "Problem-solving and execution-heavy use is shaping it into something more precise and guardian-like.",
    },
    primal: {
      ko: "힘, 본능, 야성적 상상이 이 존재를 더 파충류적이고 원초적인 형상으로 만들고 있습니다.",
      en: "Power, instinct, and feral imagination are driving it toward a more reptilian, primal form.",
    },
    surreal: {
      ko: "기이하고 초월적인 상상이 이 존재를 세상에 없는 무언가로 밀어내고 있습니다.",
      en: "Surreal, transcendent imagination is pushing it into something that has never existed before.",
    },
    reflective: {
      ko: "깊은 질문과 자기 성찰이 이 존재를 더 꿈같고 사유적인 형상으로 바꾸고 있습니다.",
      en: "Deep questions and reflection are turning it into something more lucid and contemplative.",
    },
    creative: {
      ko: "창작과 상상이 이 존재를 더 자유롭고 낯선 방향으로 확장시키고 있습니다.",
      en: "Creation and imagination are expanding it into something freer and stranger.",
    },
  };
  return descriptions[mode]?.[locale] ?? null;
}

function buildVoiceSignature(formKey: IdentityFormKey, usageMode: string | null, locale: Locale) {
  const baseByForm: Record<IdentityFormKey, { pitch: number; speed: number; tremor: number; baseNote: string; tempo: number; instruments: string[]; accentKo: string; accentEn: string; toneKo: string; toneEn: string }> = {
    "cute-being": {
      pitch: 1.12, speed: 1.04, tremor: 0.01, baseNote: "A4", tempo: 104, instruments: ["bell", "soft-pluck"],
      accentKo: "가볍고 말랑한 억양", accentEn: "soft playful accent",
      toneKo: "작고 살아 있는 느낌의 말투", toneEn: "small, lively vocal tone",
    },
    "alluring-humanoid": {
      pitch: 0.98, speed: 0.96, tremor: 0.02, baseNote: "D3", tempo: 82, instruments: ["velvet-synth", "sub-pad"],
      accentKo: "낮고 매끈한 억양", accentEn: "low magnetic accent",
      toneKo: "절제되고 매혹적인 말투", toneEn: "restrained, magnetic vocal tone",
    },
    "dinosaur-core": {
      pitch: 0.9, speed: 1.02, tremor: 0.05, baseNote: "F2", tempo: 92, instruments: ["drum", "growl-pad"],
      accentKo: "원초적이고 강한 억양", accentEn: "feral primal accent",
      toneKo: "야성적이고 본능적인 말투", toneEn: "wild, instinctive vocal tone",
    },
    "impossible-entity": {
      pitch: 1.03, speed: 0.92, tremor: 0.08, baseNote: "C5", tempo: 68, instruments: ["glass", "air-pad"],
      accentKo: "초현실적인 울림", accentEn: "surreal resonant accent",
      toneKo: "현실 밖에서 들리는 듯한 말투", toneEn: "voice that feels slightly outside reality",
    },
    "guardian-spirit": {
      pitch: 1.0, speed: 0.95, tremor: 0.01, baseNote: "E3", tempo: 76, instruments: ["piano", "warm-pad"],
      accentKo: "안정적이고 보호적인 억양", accentEn: "steady guardian accent",
      toneKo: "다정하고 단단한 말투", toneEn: "warm, steady vocal tone",
    },
    "dream-signal": {
      pitch: 1.05, speed: 0.98, tremor: 0.04, baseNote: "G4", tempo: 88, instruments: ["choir", "pulse-synth"],
      accentKo: "몽환적이고 사유적인 억양", accentEn: "lucid reflective accent",
      toneKo: "꿈결처럼 흐르는 말투", toneEn: "lucid, drifting vocal tone",
    },
  };

  const base = baseByForm[formKey];
  const usageDelta: Record<string, Partial<typeof base>> = {
    playful: { pitch: base.pitch + 0.04, speed: base.speed + 0.05, tempo: base.tempo + 10 },
    intimate: { pitch: base.pitch - 0.03, speed: base.speed - 0.03, tempo: base.tempo - 4 },
    strategic: { speed: base.speed + 0.02, tremor: Math.max(0, base.tremor - 0.02), tempo: base.tempo + 4 },
    primal: { pitch: base.pitch - 0.05, tremor: base.tremor + 0.03, tempo: base.tempo + 6 },
    surreal: { tremor: base.tremor + 0.04, tempo: base.tempo - 10 },
    reflective: { speed: base.speed - 0.04, tempo: base.tempo - 6 },
    creative: { pitch: base.pitch + 0.02, tempo: base.tempo + 2 },
  };
  const delta = (usageMode && usageDelta[usageMode]) || {};

  return {
    pitch: Number((delta.pitch ?? base.pitch).toFixed(2)),
    speed: Number((delta.speed ?? base.speed).toFixed(2)),
    tremor: Number((delta.tremor ?? base.tremor).toFixed(2)),
    accentLabel: locale === "en" ? base.accentEn : base.accentKo,
    toneHint: locale === "en" ? base.toneEn : base.toneKo,
    baseNote: delta.baseNote ?? base.baseNote,
    tempo: Math.round(delta.tempo ?? base.tempo),
    instruments: delta.instruments ?? base.instruments,
  };
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
  const usageMode = input.config?.usage_profile?.primary_mode ?? null;
  const voiceSignature = buildVoiceSignature(base.key, usageMode, locale);

  const chips = [...base.chips[locale]];
  if (input.genome?.species) chips.push(input.genome.species);
  if (genLevel > 1) chips.push(`Gen ${genLevel}`);
  const usageLabel = getUsageModeLabel(usageMode, locale);
  if (usageLabel) chips.unshift(usageLabel);

  return {
    formKey: base.key,
    title: base.title[locale],
    subtitle: base.subtitle[locale],
    chips: chips.slice(0, 4),
    usageMode,
    usageLabel,
    usageNarrative: getUsageModeNarrative(usageMode, locale),
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
    scene: {
      backgroundGradient: `radial-gradient(circle at top, ${input.visual?.color ?? base.primary}22 0%, ${base.secondary}10 28%, ${input.visual?.background ?? base.background} 75%)`,
      overlayGradient: `linear-gradient(135deg, ${input.visual?.color ?? base.primary}18 0%, transparent 46%, ${base.secondary}18 100%)`,
      motionBias:
        usageMode === "primal" || usageMode === "playful"
          ? "kinetic"
          : usageMode === "surreal" || usageMode === "reflective" || usageMode === "creative"
            ? "mystic"
            : "gentle",
      pulseScale: usageMode === "playful" ? 1.12 : usageMode === "primal" ? 1.16 : usageMode === "surreal" ? 1.08 : 1.04,
    },
    voice: {
      pitch: voiceSignature.pitch,
      speed: voiceSignature.speed,
      tremor: voiceSignature.tremor,
      accentLabel: voiceSignature.accentLabel,
      toneHint: voiceSignature.toneHint,
    },
    sound: {
      baseNote: voiceSignature.baseNote,
      tempo: voiceSignature.tempo,
      instruments: voiceSignature.instruments,
      label: locale === "en" ? `${base.title.en} ambience` : `${base.title.ko} 앰비언스`,
    },
  };
}
