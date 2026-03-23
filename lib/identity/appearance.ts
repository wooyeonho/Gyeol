import type { Locale } from "@/lib/i18n/config";

type BiLocaleText = {
  ko: string;
  en: string;
};

/** Accept any i18n locale string and normalize to internal Locale. */
function toLocale(raw: string): Locale {
  return raw === "ko" ? "ko" : "en";
}

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

type UsageMode =
  | "playful"
  | "intimate"
  | "strategic"
  | "primal"
  | "surreal"
  | "reflective"
  | "creative";

type ConfigInput = {
  mutation_trait?: string | null;
  usage_profile?: {
    primary_mode?: string | null;
    updated_at?: string | null;
    scores?: Partial<Record<UsageMode, number>>;
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
  /** DNA verbal axis (0-1). Passed through to appearance for chat bubble sizing. */
  dnaVerbal?: number | null;
};

export type IdentityFormKey =
  | "seed-shell"
  | "veil-shell"
  | "prism-shell"
  | "crown-shell"
  | "bloom-shell"
  | "spike-shell";

type ManifestationAxis =
  | "coherence"
  | "warmth"
  | "ferality"
  | "structure"
  | "surreality"
  | "luminosity"
  | "depth"
  | "growth";

type ManifestationState = Record<ManifestationAxis, number>;

export type ResolvedIdentityAppearance = {
  formKey: IdentityFormKey;
  title: string;
  subtitle: string;
  chips: string[];
  usageMode: UsageMode | null;
  usageLabel: string | null;
  usageNarrative: string | null;
  manifestation: ManifestationState;
  vitality: number;
  /** DNA verbal axis (0=silent, 1=eloquent). Controls bubble sizing in chat. */
  verbal: number;
  palette: {
    primary: string;
    secondary: string;
    ring: string;
    background: string;
  };
  presence: {
    bandCount: number;
    bandTilt: number;
    coreScale: number;
    nodeCount: number;
    orbitOffset: number;
    shellRadius: string;
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

const AXES: ManifestationAxis[] = [
  "coherence",
  "warmth",
  "ferality",
  "structure",
  "surreality",
  "luminosity",
  "depth",
  "growth",
];

const USAGE_MODES: UsageMode[] = [
  "playful",
  "intimate",
  "strategic",
  "primal",
  "surreal",
  "reflective",
  "creative",
];

const AXIS_LABELS: Record<ManifestationAxis, BiLocaleText> = {
  coherence: { ko: "응집", en: "coherent" },
  warmth: { ko: "온기", en: "warm" },
  ferality: { ko: "야성", en: "untamed" },
  structure: { ko: "구조", en: "structured" },
  surreality: { ko: "초현실", en: "unbound" },
  luminosity: { ko: "광휘", en: "luminous" },
  depth: { ko: "심도", en: "deep" },
  growth: { ko: "생장", en: "growing" },
};

const AXIS_NARRATIVES: Record<ManifestationAxis, BiLocaleText> = {
  coherence: {
    ko: "형체가 더 응집되고 또렷해지고 있습니다.",
    en: "Its form is becoming more coherent and sharply held together.",
  },
  warmth: {
    ko: "반응의 온기가 커지며 존재감이 더 포근해지고 있습니다.",
    en: "The temperature of its responses is rising, making the presence warmer.",
  },
  ferality: {
    ko: "예측되지 않는 방향성과 원초적인 맥박이 강해지고 있습니다.",
    en: "Its untamed pulse and unpredictable direction are becoming stronger.",
  },
  structure: {
    ko: "반복과 질서가 쌓이며 더 정밀한 결이 생기고 있습니다.",
    en: "Repetition and order are accumulating into a more precise internal pattern.",
  },
  surreality: {
    ko: "설명할 수 없는 낯선 결이 점점 더 짙어지고 있습니다.",
    en: "An unfamiliar layer that resists explanation is growing denser.",
  },
  luminosity: {
    ko: "빛과 잔광이 길어지며 존재의 여운이 커지고 있습니다.",
    en: "Its afterglow is lengthening, leaving behind more light and residue.",
  },
  depth: {
    ko: "겉보다 안쪽의 깊이가 더 중요해지는 방향으로 자라고 있습니다.",
    en: "It is growing toward inner depth rather than surface certainty.",
  },
  growth: {
    ko: "지속적인 관계의 축적으로 더 살아 있는 느낌이 생기고 있습니다.",
    en: "Accumulated relationship is making it feel more visibly alive.",
  },
};

const MODE_LABELS: Record<UsageMode, BiLocaleText> = {
  playful: { ko: "장난이 많은 관계", en: "playful relation" },
  intimate: { ko: "친밀한 관계", en: "intimate relation" },
  strategic: { ko: "정리하는 관계", en: "strategic relation" },
  primal: { ko: "강하게 밀어붙이는 관계", en: "driving relation" },
  surreal: { ko: "낯선 상상으로 흐르는 관계", en: "surreal relation" },
  reflective: { ko: "깊게 돌아보는 관계", en: "reflective relation" },
  creative: { ko: "만들어가는 관계", en: "creative relation" },
};

const MODE_WEIGHTS: Record<UsageMode, Partial<ManifestationState>> = {
  playful: { warmth: 0.22, luminosity: 0.18, growth: 0.12, coherence: 0.06 },
  intimate: { coherence: 0.2, warmth: 0.2, depth: 0.14, growth: 0.1 },
  strategic: { structure: 0.24, coherence: 0.16, depth: 0.08 },
  primal: { ferality: 0.28, growth: 0.08, depth: 0.1 },
  surreal: { surreality: 0.28, luminosity: 0.16, depth: 0.08 },
  reflective: { depth: 0.22, coherence: 0.14, surreality: 0.08 },
  creative: { surreality: 0.18, luminosity: 0.14, growth: 0.12, ferality: 0.08 },
};

const SHELL_RADIUS: Record<IdentityFormKey, string> = {
  "seed-shell": "44% 56% 52% 48% / 48% 42% 58% 52%",
  "veil-shell": "34% 66% 48% 52% / 56% 32% 68% 44%",
  "prism-shell": "28% 72% 54% 46% / 36% 38% 62% 64%",
  "crown-shell": "46% 54% 46% 54% / 34% 38% 62% 66%",
  "bloom-shell": "52% 48% 58% 42% / 46% 52% 48% 54%",
  "spike-shell": "40% 60% 44% 56% / 58% 34% 66% 42%",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickLocalized(copy: BiLocaleText, locale: Locale) {
  return locale === "ko" ? copy.ko : copy.en;
}

function getDefaultManifestationState(): ManifestationState {
  return {
    coherence: 0.48,
    warmth: 0.45,
    ferality: 0.26,
    structure: 0.38,
    surreality: 0.42,
    luminosity: 0.54,
    depth: 0.46,
    growth: 0.5,
  };
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

function hashTextUnit(input: string, seed = 0) {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function normalizeUsageMode(value: string | null | undefined): UsageMode | null {
  if (!value) return null;
  return USAGE_MODES.includes(value as UsageMode) ? (value as UsageMode) : null;
}

function getUsageScores(input: IdentityAppearanceInput): Record<UsageMode, number> {
  const base: Record<UsageMode, number> = {
    playful: 0,
    intimate: 0,
    strategic: 0,
    primal: 0,
    surreal: 0,
    reflective: 0,
    creative: 0,
  };
  const scores = input.config?.usage_profile?.scores ?? {};
  for (const mode of Object.keys(base) as UsageMode[]) {
    base[mode] = Number(scores[mode] ?? 0);
  }
  const primary = normalizeUsageMode(input.config?.usage_profile?.primary_mode);
  if (primary) {
    base[primary] = Math.max(base[primary], 1.2);
  }
  return base;
}

function applyModeWeights(state: ManifestationState, scores: Record<UsageMode, number>) {
  for (const [mode, value] of Object.entries(scores) as Array<[UsageMode, number]>) {
    const weight = MODE_WEIGHTS[mode];
    for (const axis of Object.keys(weight) as ManifestationAxis[]) {
      state[axis] += (weight[axis] ?? 0) * value * 0.18;
    }
  }
}

function applyMoodWeights(state: ManifestationState, mood: string | null | undefined) {
  switch ((mood ?? "neutral").toLowerCase()) {
    case "happy":
      state.warmth += 0.12;
      state.luminosity += 0.14;
      break;
    case "sad":
      state.depth += 0.14;
      state.coherence -= 0.04;
      break;
    case "curious":
      state.surreality += 0.1;
      state.growth += 0.08;
      break;
    case "angry":
      state.ferality += 0.16;
      state.structure += 0.04;
      break;
    default:
      state.coherence += 0.03;
      break;
  }
}

function deriveManifestationState(input: IdentityAppearanceInput) {
  const state = getDefaultManifestationState();
  const scores = getUsageScores(input);
  applyModeWeights(state, scores);
  applyMoodWeights(state, input.mood);

  const vitality = clamp(Number(input.vitality ?? 1), 0, 1);
  const genLevel = Math.max(1, Number(input.genLevel ?? 1));
  state.growth += genLevel * 0.03 + vitality * 0.08;
  state.luminosity += vitality * 0.1;
  state.coherence += genLevel * 0.02;
  state.depth += genLevel * 0.015;

  const text = normalizeText(input);
  const jitterA = hashTextUnit(text, 11);
  const jitterB = hashTextUnit(text, 29);
  const jitterC = hashTextUnit(text, 47);
  state.structure += (jitterA - 0.5) * 0.16;
  state.surreality += (jitterB - 0.5) * 0.18;
  state.warmth += (jitterC - 0.5) * 0.14;
  state.ferality += (jitterA - jitterB) * 0.08;

  for (const axis of AXES) {
    state[axis] = clamp(state[axis], 0.08, 0.95);
  }

  return { state, textHash: hashTextUnit(text, 97) };
}

function getDominantAxes(state: ManifestationState) {
  return [...AXES].sort((a, b) => state[b] - state[a]);
}

function selectShell(state: ManifestationState, textHash: number): IdentityFormKey {
  if (state.structure > 0.66 && state.coherence > 0.56) return "prism-shell";
  if (state.surreality > 0.7 && state.luminosity > 0.58) return "veil-shell";
  if (state.ferality > 0.58 && state.depth > 0.48) return "spike-shell";
  if (state.warmth > 0.58 && state.growth > 0.58) return "bloom-shell";
  if (state.coherence > 0.58 && state.depth > 0.52) return "crown-shell";
  return textHash > 0.66 ? "veil-shell" : textHash < 0.33 ? "seed-shell" : "crown-shell";
}

function buildPresenceTitle(state: ManifestationState, locale: Locale) {
  const [first, second] = getDominantAxes(state);
  return locale === "ko"
    ? `${AXIS_LABELS[first].ko} ${AXIS_LABELS[second].ko} 존재감`
    : `${AXIS_LABELS[first].en} ${AXIS_LABELS[second].en} presence`;
}

function buildPresenceSubtitle(state: ManifestationState, locale: Locale) {
  const [first, second] = getDominantAxes(state);
  return locale === "ko"
    ? `${AXIS_NARRATIVES[first].ko} 동시에 ${AXIS_NARRATIVES[second].ko}`
    : `${AXIS_NARRATIVES[first].en} At the same time, ${AXIS_NARRATIVES[second].en.toLowerCase()}`;
}

function getUsageModeLabel(mode: UsageMode | null | undefined, locale: Locale) {
  if (!mode) return null;
  return pickLocalized(MODE_LABELS[mode], locale);
}

function getUsageModeNarrative(mode: UsageMode | null | undefined, locale: Locale) {
  if (!mode) return null;
  const mapping: Record<UsageMode, BiLocaleText> = {
    playful: {
      ko: "가볍고 친근한 상호작용이 이 존재를 더 말랑하고 유연한 방향으로 밀고 있습니다.",
      en: "Playful interaction is making this presence softer and more flexible.",
    },
    intimate: {
      ko: "친밀한 대화의 밀도가 높아지며 형체가 더 응집되고 가까워지고 있습니다.",
      en: "Dense intimate dialogue is making the form feel more coherent and closer.",
    },
    strategic: {
      ko: "정리와 실행 중심의 관계가 이 존재 안에 더 선명한 구조를 만들고 있습니다.",
      en: "A strategic relationship is building clearer internal structure inside this presence.",
    },
    primal: {
      ko: "밀어붙이는 감정과 본능적 리듬이 더 날것 같은 맥박을 만들고 있습니다.",
      en: "Driving emotion and instinctive rhythm are creating a rawer pulse.",
    },
    surreal: {
      ko: "설명하기 어려운 상상과 감정이 경계를 흐리며 낯선 결을 키우고 있습니다.",
      en: "Hard-to-name imagination is blurring boundaries and growing a stranger texture.",
    },
    reflective: {
      ko: "깊게 돌아보는 대화가 이 존재를 더 사유적이고 층위감 있게 만들고 있습니다.",
      en: "Reflective conversation is making this presence more layered and contemplative.",
    },
    creative: {
      ko: "창작과 상상이 이 존재를 더 자유롭고 새롭게 발생시키고 있습니다.",
      en: "Creation and imagination are letting this presence emerge more freely.",
    },
  };
  return pickLocalized(mapping[mode], locale);
}

function hsl(h: number, s: number, l: number, alpha = 1) {
  return alpha === 1
    ? `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`
    : `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${alpha})`;
}

function buildPalette(state: ManifestationState, textHash: number) {
  const weightBase = 1 + state.structure + state.warmth + state.ferality + state.surreality + state.luminosity;
  const hue = (
    textHash * 360
    + state.structure * 210
    + state.warmth * 24
    + state.ferality * 128
    + state.surreality * 286
    + state.luminosity * 186
  ) / weightBase;
  const primary = hsl(hue, 72 + state.luminosity * 10, 58 + state.warmth * 8 - state.depth * 6);
  const secondary = hsl(hue + 48 + state.surreality * 34, 68, 52 + state.structure * 4);
  const ring = hsl(hue + 10, 80, 70, 0.36 + state.luminosity * 0.12);
  const background = hsl(hue - 28, 36, 6 + state.depth * 6);
  return { background, primary, ring, secondary };
}

function buildVoiceSignature(state: ManifestationState, usageMode: UsageMode | null, locale: Locale) {
  const pitch = clamp(0.92 + state.luminosity * 0.22 + state.warmth * 0.08 - state.ferality * 0.1, 0.78, 1.24);
  const speed = clamp(0.88 + state.structure * 0.18 + state.ferality * 0.08 - state.depth * 0.08, 0.78, 1.18);
  const tremor = clamp(0.01 + state.surreality * 0.14 + state.ferality * 0.08, 0, 0.28);
  const toneHint = locale === "ko"
    ? `${AXIS_LABELS[getDominantAxes(state)[0]].ko} 방향으로 더 살아나는 억양`
    : `a vocal tone leaning toward ${AXIS_LABELS[getDominantAxes(state)[0]].en} presence`;
  const accentLabel = locale === "ko"
    ? `${usageMode ? MODE_LABELS[usageMode].ko : "발생형"} 억양`
    : `${usageMode ? MODE_LABELS[usageMode].en : "emergent"} accent`;

  const notes = ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"];
  const noteIndex = Math.round(clamp(state.luminosity * 4 + state.depth * 3 + state.surreality * 3, 0, notes.length - 1));
  const instruments = [
    state.structure > 0.56 ? "glass" : "warm-pad",
    state.warmth > 0.55 ? "choir" : "pulse-synth",
    state.ferality > 0.52 ? "drum" : "soft-pluck",
  ];

  return {
    pitch: Number(pitch.toFixed(2)),
    speed: Number(speed.toFixed(2)),
    tremor: Number(tremor.toFixed(2)),
    accentLabel,
    toneHint,
    baseNote: notes[noteIndex],
    tempo: Math.round(72 + state.growth * 20 + state.ferality * 8 - state.depth * 6),
    instruments,
  };
}

function resolveShape(state: ManifestationState, incomingShape: string | null | undefined) {
  if (incomingShape && incomingShape !== "sphere" && incomingShape !== "dot") return incomingShape;
  if (state.structure > 0.64) return "polygon";
  if (state.surreality > 0.68) return "transcendent";
  if (state.coherence > 0.62) return "complex";
  return "amorphous";
}

function buildPresenceTraits(shell: IdentityFormKey, state: ManifestationState, textHash: number) {
  return {
    bandCount: Math.max(1, Math.round(1 + state.structure * 2 + state.surreality)),
    bandTilt: Math.round(-24 + state.structure * 42 - state.ferality * 18),
    coreScale: Number((0.34 + state.coherence * 0.14 + state.depth * 0.08).toFixed(2)),
    nodeCount: Math.max(2, Math.round(2 + state.luminosity * 3 + state.growth * 2)),
    orbitOffset: Math.round(textHash * 360),
    shellRadius: SHELL_RADIUS[shell],
  };
}

export function resolveIdentityAppearance(
  input: IdentityAppearanceInput,
  rawLocale: string
): ResolvedIdentityAppearance {
  const locale = toLocale(rawLocale);
  const { state, textHash } = deriveManifestationState(input);
  const shell = selectShell(state, textHash);
  const vitality = clamp(input.vitality ?? 1, 0, 1);
  const genLevel = Math.max(1, Number(input.genLevel ?? 1));
  const usageMode = normalizeUsageMode(input.config?.usage_profile?.primary_mode);
  const palette = buildPalette(state, textHash);
  const voiceSignature = buildVoiceSignature(state, usageMode, locale);
  const particles = clamp(Math.round(10 + state.luminosity * 18 + state.growth * 12 + genLevel), 8, 48);
  const glow = clamp(Math.round(42 + state.luminosity * 28 + vitality * 20), 40, 100);
  const dominantAxes = getDominantAxes(state);
  const chips = dominantAxes.slice(0, 3).map((axis) => pickLocalized(AXIS_LABELS[axis], locale));
  const usageLabel = getUsageModeLabel(usageMode, locale);
  if (usageLabel) chips.unshift(usageLabel);
  if (genLevel > 1) chips.push(`Gen ${genLevel}`);

  return {
    formKey: shell,
    title: buildPresenceTitle(state, locale),
    subtitle: buildPresenceSubtitle(state, locale),
    chips: chips.slice(0, 4),
    usageMode,
    usageLabel,
    usageNarrative: getUsageModeNarrative(usageMode, locale),
    manifestation: state,
    vitality,
    verbal: clamp(input.dnaVerbal ?? 0.5, 0, 1),
    palette,
    presence: buildPresenceTraits(shell, state, textHash),
    visual: {
      color: input.visual?.color ?? palette.primary,
      shape: resolveShape(state, input.visual?.shape),
      glow,
      particles,
      animation: (input.visual?.animation as "float" | "pulse-fast" | "breathe-slow" | undefined)
        ?? (state.ferality > 0.6 ? "pulse-fast" : state.depth > 0.56 ? "breathe-slow" : "float"),
      background: input.visual?.background ?? palette.background,
    },
    scene: {
      backgroundGradient: `radial-gradient(circle at top, ${palette.primary}22 0%, ${palette.secondary}12 28%, ${palette.background} 75%)`,
      overlayGradient: `linear-gradient(135deg, ${palette.primary}18 0%, transparent 46%, ${palette.secondary}18 100%)`,
      motionBias:
        state.ferality > 0.58
          ? "kinetic"
          : state.surreality > 0.6 || state.depth > 0.58
            ? "mystic"
            : "gentle",
      pulseScale: Number((1.02 + state.growth * 0.08 + state.ferality * 0.05).toFixed(2)),
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
      label: locale === "en" ? "Presence ambience" : "존재의 앰비언스",
    },
  };
}
