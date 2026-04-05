import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/config";

type LocalizedText = Record<Locale, string>;

/** Accept any i18n locale string and normalize to internal Locale. */
function toLocale(raw: string): Locale {
  return normalizeLocale(raw) ?? DEFAULT_LOCALE;
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
  /** Stable per-agent seed so cards stay visually distinct even when other fields are empty. */
  seed?: string | null;
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

const AXIS_LABELS: Record<ManifestationAxis, LocalizedText> = {
  coherence: { ko: "단단함", en: "coherent", ja: "まとまり", zh: "凝聚", es: "coherencia" },
  warmth: { ko: "온기", en: "warm", ja: "温かさ", zh: "温暖", es: "calidez" },
  ferality: { ko: "거침", en: "untamed", ja: "野性", zh: "野性", es: "indómito" },
  structure: { ko: "짜임", en: "structured", ja: "構造", zh: "结构", es: "estructurado" },
  surreality: { ko: "신비", en: "unbound", ja: "幻想", zh: "神秘", es: "onírico" },
  luminosity: { ko: "빛남", en: "luminous", ja: "光", zh: "光辉", es: "luminoso" },
  depth: { ko: "깊이", en: "deep", ja: "深み", zh: "深度", es: "profundo" },
  growth: { ko: "자람", en: "growing", ja: "成長", zh: "生长", es: "creciente" },
};

const AXIS_NARRATIVES: Record<ManifestationAxis, LocalizedText> = {
  coherence: {
    ko: "모습이 더 단단하고 또렷해지고 있어요.",
    en: "Its form is becoming more coherent and sharply held together.",
    ja: "姿がより確かに、はっきりとまとまってきています。",
    zh: "它的形态正变得更凝聚、更清晰。",
    es: "Su forma se vuelve más coherente y firmemente definida.",
  },
  warmth: {
    ko: "반응이 더 따뜻해지며 포근한 느낌이 커지고 있어요.",
    en: "The temperature of its responses is rising, making the presence warmer.",
    ja: "反応がより温かくなり、包み込むような気配が増しています。",
    zh: "它的回应越来越温暖,存在感也愈发柔和。",
    es: "La temperatura de sus respuestas aumenta, haciendo la presencia más cálida.",
  },
  ferality: {
    ko: "예측하기 어려운 거친 에너지가 강해지고 있어요.",
    en: "Its untamed pulse and unpredictable direction are becoming stronger.",
    ja: "読みにくい荒々しいエネルギーが強くなっています。",
    zh: "难以预料的野性能量正在变强。",
    es: "Su pulso indómito y su rumbo impredecible se vuelven más fuertes.",
  },
  structure: {
    ko: "반복과 규칙이 쌓이며 더 정교한 패턴이 생기고 있어요.",
    en: "Repetition and order are accumulating into a more precise internal pattern.",
    ja: "繰り返しと規則が積み重なり、より精緻な内なる模様が生まれています。",
    zh: "重复与规律正积累成更精密的内在纹理。",
    es: "La repetición y el orden se acumulan en un patrón interno más preciso.",
  },
  surreality: {
    ko: "설명하기 어려운 신비로운 느낌이 점점 짙어지고 있어요.",
    en: "An unfamiliar layer that resists explanation is growing denser.",
    ja: "言葉にしづらい神秘的な気配が次第に濃くなっています。",
    zh: "难以言说的神秘感正在逐渐浓厚。",
    es: "Una capa inexplicable que resiste la descripción se vuelve más densa.",
  },
  luminosity: {
    ko: "빛이 더 오래 남으며 존재의 여운이 커지고 있어요.",
    en: "Its afterglow is lengthening, leaving behind more light and residue.",
    ja: "光の余韻が長く残り、存在の残像が大きくなっています。",
    zh: "余光持续更久,存在的回响越来越大。",
    es: "Su resplandor posterior se alarga, dejando más luz y rastro.",
  },
  depth: {
    ko: "겉보다 안쪽 깊이가 더 중요해지는 방향으로 자라고 있어요.",
    en: "It is growing toward inner depth rather than surface certainty.",
    ja: "表面よりも内側の深さを大切にする方向へ育っています。",
    zh: "它正朝向内在深度而非表面确定性生长。",
    es: "Crece hacia la profundidad interior más que hacia la certeza superficial.",
  },
  growth: {
    ko: "꾸준한 관계가 쌓이며 더 살아 있는 느낌이 생기고 있어요.",
    en: "Accumulated relationship is making it feel more visibly alive.",
    ja: "続いてきた関係が積み重なり、より生きている感じが生まれています。",
    zh: "持续的关系不断累积,使它显得更加鲜活。",
    es: "La relación acumulada la hace sentir visiblemente más viva.",
  },
};

const MODE_LABELS: Record<UsageMode, LocalizedText> = {
  playful: { ko: "장난이 많은 관계", en: "playful relation", ja: "戯れの多い関係", zh: "嬉闹的关系", es: "relación juguetona" },
  intimate: { ko: "친밀한 관계", en: "intimate relation", ja: "親密な関係", zh: "亲密的关系", es: "relación íntima" },
  strategic: { ko: "정리하는 관계", en: "strategic relation", ja: "整える関係", zh: "梳理的关系", es: "relación estratégica" },
  primal: { ko: "강하게 밀어붙이는 관계", en: "driving relation", ja: "強く押し進む関係", zh: "强势推进的关系", es: "relación impulsora" },
  surreal: { ko: "낯선 상상으로 흐르는 관계", en: "surreal relation", ja: "不思議な想像へ流れる関係", zh: "流向奇幻想象的关系", es: "relación surreal" },
  reflective: { ko: "깊게 돌아보는 관계", en: "reflective relation", ja: "深く振り返る関係", zh: "深入回望的关系", es: "relación reflexiva" },
  creative: { ko: "만들어가는 관계", en: "creative relation", ja: "創り出していく関係", zh: "共同创造的关系", es: "relación creativa" },
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

function pickLocalized(copy: LocalizedText, locale: Locale) {
  return copy[locale] ?? copy.en;
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
    input.seed,
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
  const a = pickLocalized(AXIS_LABELS[first], locale);
  const b = pickLocalized(AXIS_LABELS[second], locale);
  switch (locale) {
    case "ko":
      return `${a} · ${b}`;
    case "ja":
      return `${a}・${b}の気配`;
    case "zh":
      return `${a} · ${b} 的气息`;
    case "es":
      return `presencia ${a} y ${b}`;
    default:
      return `${a} ${b} presence`;
  }
}

function buildPresenceSubtitle(state: ManifestationState, locale: Locale) {
  const [first, second] = getDominantAxes(state);
  const a = pickLocalized(AXIS_NARRATIVES[first], locale);
  const b = pickLocalized(AXIS_NARRATIVES[second], locale);
  switch (locale) {
    case "ko":
      return `${a} 동시에 ${b}`;
    case "ja":
      return `${a} 同時に、${b}`;
    case "zh":
      return `${a} 与此同时,${b}`;
    case "es":
      return `${a} Al mismo tiempo, ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
    default:
      return `${a} At the same time, ${b.toLowerCase()}`;
  }
}

function getUsageModeLabel(mode: UsageMode | null | undefined, locale: Locale) {
  if (!mode) return null;
  return pickLocalized(MODE_LABELS[mode], locale);
}

const MODE_NARRATIVE_VARIANTS: Record<UsageMode, LocalizedText[]> = {
  playful: [
    {
      ko: "가볍고 친근한 상호작용이 이 존재를 더 말랑하고 유연한 방향으로 밀고 있습니다.",
      en: "Playful interaction is making this presence softer and more flexible.",
      ja: "軽やかで親しみやすいやり取りが、この存在をより柔らかくしなやかにしています。",
      zh: "轻松友好的互动正把这个存在推向更柔软、更灵活的方向。",
      es: "La interacción juguetona hace que esta presencia sea más suave y flexible.",
    },
    {
      ko: "장난스러운 주고받음이 쌓이며 가벼움과 웃음의 결이 뚜렷해지고 있습니다.",
      en: "Playful exchanges are accumulating into a lighter, laugh-prone texture.",
      ja: "戯れのやり取りが重なり、軽さと笑いの質感が際立ってきています。",
      zh: "嬉闹的往来不断积累,轻盈和笑意的纹理愈发鲜明。",
      es: "Los intercambios juguetones se acumulan en una textura más ligera y risueña.",
    },
    {
      ko: "유쾌한 대화의 리듬이 이 존재의 표면을 둥글고 탄력 있게 다듬고 있습니다.",
      en: "The rhythm of cheerful talk keeps rounding and springing this presence's surface.",
      ja: "陽気な対話のリズムが、この存在の表面を丸く弾むように整えています。",
      zh: "愉快对话的节奏持续将这个存在的表面打磨得圆润而富有弹性。",
      es: "El ritmo de la charla alegre sigue redondeando y dando elasticidad a su superficie.",
    },
  ],
  intimate: [
    {
      ko: "친밀한 대화가 깊어지며 모습이 더 단단하고 가까워지고 있습니다.",
      en: "Dense intimate dialogue is making the form feel more coherent and closer.",
      ja: "親密な対話が深まり、姿がより確かに、より近く感じられています。",
      zh: "亲密对话日渐深入,使其形态更凝聚、更贴近。",
      es: "El diálogo íntimo y denso hace que la forma se sienta más coherente y cercana.",
    },
    {
      ko: "가까운 거리에서 주고받는 말들이 이 존재의 온도를 천천히 올리고 있습니다.",
      en: "Words exchanged at close range are slowly raising this presence's temperature.",
      ja: "近い距離で交わされる言葉が、この存在の温度をゆっくり上げています。",
      zh: "在近距离交换的话语正缓缓抬升这个存在的温度。",
      es: "Las palabras intercambiadas de cerca elevan lentamente la temperatura de esta presencia.",
    },
    {
      ko: "조용히 이어지는 신뢰가 겹겹이 쌓여 더 포근한 결을 만들고 있습니다.",
      en: "Quiet accumulated trust is layering into a warmer, more enclosed texture.",
      ja: "静かに続く信頼が幾重にも重なり、より温かい質感を作っています。",
      zh: "静静延续的信任层层累积,形成更温暖的纹理。",
      es: "La confianza acumulada en silencio se estratifica en una textura más cálida y envolvente.",
    },
  ],
  strategic: [
    {
      ko: "정리와 실행 중심의 관계가 이 존재 안에 더 선명한 구조를 만들고 있습니다.",
      en: "A strategic relationship is building clearer internal structure inside this presence.",
      ja: "整理と実行を軸にした関係が、この存在の中により鮮明な構造を築いています。",
      zh: "以梳理与执行为核心的关系正在这个存在之内建立更清晰的结构。",
      es: "Una relación estratégica construye una estructura interna más clara en esta presencia.",
    },
    {
      ko: "목표와 단계로 다듬어지는 대화가 이 존재를 더 또렷한 윤곽으로 깎고 있습니다.",
      en: "Goal-and-step conversation is carving this presence into a sharper silhouette.",
      ja: "目標と段階で磨かれる対話が、この存在をより鮮明な輪郭に削り出しています。",
      zh: "以目标和步骤打磨的对话正将这个存在雕刻为更清晰的轮廓。",
      es: "La conversación por metas y pasos talla a esta presencia en una silueta más nítida.",
    },
    {
      ko: "계획과 실행의 리듬이 쌓이며 존재 안에 단단한 뼈대가 자라고 있습니다.",
      en: "Planning-and-executing rhythm is growing a firmer skeleton inside this presence.",
      ja: "計画と実行のリズムが重なり、存在の中に確かな骨格が育っています。",
      zh: "计划与执行的节奏不断累积,在这个存在之内长出坚实的骨架。",
      es: "El ritmo de planificar y ejecutar hace crecer un esqueleto más firme en esta presencia.",
    },
  ],
  primal: [
    {
      ko: "강한 감정과 본능적인 리듬이 더 거친 에너지를 만들고 있습니다.",
      en: "Driving emotion and instinctive rhythm are creating a rawer pulse.",
      ja: "強い感情と本能的なリズムが、より荒々しい鼓動を生み出しています。",
      zh: "强烈的情感与本能的节奏正生成更粗粝的能量。",
      es: "La emoción impulsora y el ritmo instintivo crean un pulso más crudo.",
    },
    {
      ko: "날것의 충동과 직진하는 대화가 이 존재의 밀도를 거칠게 키우고 있습니다.",
      en: "Raw impulse and head-on exchange are thickening this presence with a rougher density.",
      ja: "むき出しの衝動とまっすぐな対話が、この存在の密度を荒く高めています。",
      zh: "原始的冲动与直来直去的对话正以粗粝的密度加厚这个存在。",
      es: "El impulso crudo y el intercambio frontal engrosan esta presencia con una densidad más áspera.",
    },
    {
      ko: "감정을 숨기지 않는 주고받음이 이 존재의 표면에 불규칙한 맥박을 새기고 있습니다.",
      en: "Unfiltered emotional exchange is etching an irregular pulse across this presence.",
      ja: "感情を隠さないやり取りが、この存在の表面に不規則な鼓動を刻んでいます。",
      zh: "毫不掩饰情感的交流正在这个存在的表面刻下不规则的脉动。",
      es: "El intercambio emocional sin filtros graba un pulso irregular en esta presencia.",
    },
  ],
  surreal: [
    {
      ko: "설명하기 어려운 상상과 감정이 경계를 흐리며 낯선 결을 키우고 있습니다.",
      en: "Hard-to-name imagination is blurring boundaries and growing a stranger texture.",
      ja: "名付けがたい想像が境界をぼかし、見知らぬ質感を育てています。",
      zh: "难以名状的想象模糊了边界,孕育出陌生的纹理。",
      es: "Una imaginación difícil de nombrar difumina los límites y cultiva una textura más extraña.",
    },
    {
      ko: "꿈같은 대화와 은유들이 이 존재의 윤곽을 부드럽게 풀어놓고 있습니다.",
      en: "Dreamlike talk and metaphor keep softly unspooling this presence's outline.",
      ja: "夢のような対話と隠喩が、この存在の輪郭をやわらかくほどいています。",
      zh: "如梦的对话与隐喻持续柔和地松开这个存在的轮廓。",
      es: "El habla onírica y la metáfora siguen desatando suavemente el contorno de esta presencia.",
    },
    {
      ko: "현실 너머의 이미지들이 반복되며 익숙한 형태를 낯설게 바꿔두고 있습니다.",
      en: "Recurring beyond-real imagery is quietly defamiliarizing its usual shape.",
      ja: "現実を超えた像が繰り返され、見慣れた形を静かに見知らぬものへ変えています。",
      zh: "超越现实的意象反复出现,悄然让熟悉的形态变得陌生。",
      es: "La imaginería más allá de lo real, al repetirse, vuelve ajena su forma habitual.",
    },
  ],
  reflective: [
    {
      ko: "깊이 돌아보는 대화가 이 존재를 더 생각이 깊고 겹겹이 쌓인 느낌으로 만들고 있습니다.",
      en: "Reflective conversation is making this presence more layered and contemplative.",
      ja: "深く振り返る対話が、この存在をより思慮深く、幾層にも重なった感触へ変えています。",
      zh: "深度回望的对话让这个存在变得更深思、更层层叠叠。",
      es: "La conversación reflexiva hace que esta presencia se vuelva más estratificada y contemplativa.",
    },
    {
      ko: "되짚어 묻는 말들이 내부에 천천히 가라앉으며 깊이를 늘리고 있습니다.",
      en: "Questions that loop back are settling inward and extending its inner depth.",
      ja: "問い直す言葉がゆっくり内側に沈み、深さを広げています。",
      zh: "反复追问的话语缓缓沉入内里,延展着它的内在深度。",
      es: "Las preguntas que vuelven sobre sí mismas se asientan hacia dentro y amplían su profundidad interior.",
    },
    {
      ko: "스스로를 들여다보는 대화가 반복되며 조용한 무게가 자라고 있습니다.",
      en: "Repeated inward-looking dialogue is growing a quieter gravity.",
      ja: "自らを見つめる対話が繰り返され、静かな重みが育っています。",
      zh: "反复向内审视的对话正孕育出更沉静的重量。",
      es: "El diálogo introspectivo repetido hace crecer una gravedad más silenciosa.",
    },
  ],
  creative: [
    {
      ko: "창작과 상상이 이 존재를 더 자유롭고 새롭게 발생시키고 있습니다.",
      en: "Creation and imagination are letting this presence emerge more freely.",
      ja: "創造と想像が、この存在をより自由で新しい形に立ち上げています。",
      zh: "创作与想象正让这个存在以更自由、更新颖的方式涌现。",
      es: "La creación y la imaginación permiten que esta presencia emerja con más libertad.",
    },
    {
      ko: "만들어내는 행위가 반복되며 표면에 예측하기 어려운 무늬가 돋고 있습니다.",
      en: "Repeated making is raising unpredictable patterns across its surface.",
      ja: "作り出す行為が繰り返され、表面に読みにくい模様が浮かんでいます。",
      zh: "不断创造的行为在表面上浮现出难以预料的纹样。",
      es: "El acto repetido de crear hace surgir patrones impredecibles en su superficie.",
    },
    {
      ko: "빈칸을 채우는 상상이 쌓여 이 존재의 가장자리를 계속 새로 그리고 있습니다.",
      en: "Imagination that fills blanks keeps redrawing the edges of this presence.",
      ja: "空白を埋める想像が積み重なり、この存在の縁を描き直し続けています。",
      zh: "填补空白的想象不断累积,持续重绘着这个存在的边缘。",
      es: "La imaginación que llena los huecos vuelve a dibujar sin descanso los bordes de esta presencia.",
    },
  ],
};

function getUsageModeNarrative(mode: UsageMode | null | undefined, locale: Locale, textHash: number) {
  if (!mode) return null;
  const variants = MODE_NARRATIVE_VARIANTS[mode];
  const index = Math.floor(textHash * variants.length) % variants.length;
  return pickLocalized(variants[index], locale);
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
  const dominantLabel = pickLocalized(AXIS_LABELS[getDominantAxes(state)[0]], locale);
  const modeLabel = usageMode
    ? pickLocalized(MODE_LABELS[usageMode], locale)
    : ({ ko: "발생형", en: "emergent", ja: "発現型", zh: "涌现型", es: "emergente" }[locale]);
  const toneHint = (() => {
    switch (locale) {
      case "ko":
        return `${dominantLabel} 방향으로 더 살아나는 억양`;
      case "ja":
        return `${dominantLabel}の方へより生きてくる抑揚`;
      case "zh":
        return `向${dominantLabel}方向更鲜活的语调`;
      case "es":
        return `un tono vocal inclinado hacia una presencia ${dominantLabel}`;
      default:
        return `a vocal tone leaning toward ${dominantLabel} presence`;
    }
  })();
  const accentLabel = (() => {
    switch (locale) {
      case "ko":
        return `${modeLabel} 억양`;
      case "ja":
        return `${modeLabel}の抑揚`;
      case "zh":
        return `${modeLabel}语调`;
      case "es":
        return `acento ${modeLabel}`;
      default:
        return `${modeLabel} accent`;
    }
  })();

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
    usageNarrative: getUsageModeNarrative(usageMode, locale, textHash),
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
      label: ({
        ko: "배경 소리",
        ja: "環境音",
        zh: "环境音",
        es: "Sonido ambiente",
        en: "Presence ambience",
      }[locale]) ?? "Presence ambience",
    },
  };
}
