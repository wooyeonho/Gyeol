import { DNA_AXES, type DNAAxis } from "@/lib/genome/dna";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/config";

/**
 * Localized display labels for the 16 DNA axes.
 *
 * Keep this file as the single source of truth for rendering DNA axis names
 * in the UI. Never render the raw axis key (e.g. "verbal", "independence")
 * directly — call getDnaAxisLabel() so every surface shows the user a
 * natural-language label in their own locale.
 */
const DNA_AXIS_LABELS: Record<DNAAxis, Record<Locale, string>> = {
  // Cognitive
  analytical: { ko: "분석적", en: "Analytical", ja: "分析的", zh: "分析型", es: "Analítico" },
  intuitive: { ko: "직관적", en: "Intuitive", ja: "直感的", zh: "直觉型", es: "Intuitivo" },
  verbal: { ko: "언어적", en: "Verbal", ja: "言語的", zh: "言语型", es: "Verbal" },
  spatial: { ko: "공간적", en: "Spatial", ja: "空間的", zh: "空间型", es: "Espacial" },
  // Emotional
  warmth: { ko: "따뜻함", en: "Warmth", ja: "温かさ", zh: "温暖", es: "Calidez" },
  intensity: { ko: "강렬함", en: "Intensity", ja: "強さ", zh: "强烈", es: "Intensidad" },
  stability: { ko: "안정감", en: "Stability", ja: "安定", zh: "稳定", es: "Estabilidad" },
  openness: { ko: "개방성", en: "Openness", ja: "開放性", zh: "开放", es: "Apertura" },
  // Social
  assertiveness: { ko: "주도성", en: "Assertiveness", ja: "主張性", zh: "主见", es: "Asertividad" },
  empathy: { ko: "공감력", en: "Empathy", ja: "共感", zh: "共情", es: "Empatía" },
  playfulness: { ko: "유희성", en: "Playfulness", ja: "遊び心", zh: "玩趣", es: "Juego" },
  independence: { ko: "독립성", en: "Independence", ja: "独立性", zh: "独立", es: "Independencia" },
  // Meta
  curiosity: { ko: "호기심", en: "Curiosity", ja: "好奇心", zh: "好奇心", es: "Curiosidad" },
  persistence: { ko: "끈기", en: "Persistence", ja: "粘り強さ", zh: "坚持", es: "Persistencia" },
  adaptability: { ko: "적응력", en: "Adaptability", ja: "適応力", zh: "适应力", es: "Adaptabilidad" },
  creativity: { ko: "창의성", en: "Creativity", ja: "創造性", zh: "创造力", es: "Creatividad" },
  // Physical Form
  bodyShape: { ko: "체형", en: "Body Shape", ja: "体型", zh: "体型", es: "Forma" },
  limbLength: { ko: "사지길이", en: "Limb Length", ja: "四肢の長さ", zh: "肢体长度", es: "Extremidades" },
  headRatio: { ko: "머리비율", en: "Head Ratio", ja: "頭の比率", zh: "头部比例", es: "Proporción" },
  bodyDensity: { ko: "밀도", en: "Density", ja: "密度", zh: "密度", es: "Densidad" },
  // Surface
  furDensity: { ko: "털밀도", en: "Fur Density", ja: "毛の密度", zh: "毛发密度", es: "Pelaje" },
  patternComplexity: { ko: "무늬", en: "Pattern", ja: "模様", zh: "纹理", es: "Patrón" },
  transparency: { ko: "투명도", en: "Transparency", ja: "透明度", zh: "透明度", es: "Transparencia" },
  shininess: { ko: "광택", en: "Shininess", ja: "光沢", zh: "光泽", es: "Brillo" },
  // Expression
  eyeSize: { ko: "눈크기", en: "Eye Size", ja: "目の大きさ", zh: "眼睛大小", es: "Ojos" },
  mouthExpressiveness: { ko: "표정", en: "Expression", ja: "表情", zh: "表情", es: "Expresión" },
  blushIntensity: { ko: "홍조", en: "Blush", ja: "赤面", zh: "红晕", es: "Rubor" },
  glowReactivity: { ko: "발광", en: "Glow", ja: "発光", zh: "发光", es: "Brillo" },
  // Behavior
  locomotionStyle: { ko: "이동방식", en: "Movement", ja: "移動", zh: "移动", es: "Movimiento" },
  voiceTimbre: { ko: "음색", en: "Voice", ja: "声色", zh: "音色", es: "Voz" },
  socialDistance: { ko: "거리감", en: "Distance", ja: "距離感", zh: "距离感", es: "Distancia" },
  elementalAffinity: { ko: "원소", en: "Element", ja: "属性", zh: "元素", es: "Elemento" },
};

function isDnaAxis(value: string): value is DNAAxis {
  return (DNA_AXES as readonly string[]).includes(value);
}

/**
 * Return the localized label for a DNA axis. Falls back gracefully:
 * - unknown locale → DEFAULT_LOCALE ("en")
 * - unknown axis → the raw key, title-cased
 *
 * @param axis The DNA axis key (e.g. "verbal"). Accepts `string` for
 *             ergonomics at call sites that receive untyped data from APIs.
 * @param rawLocale Any locale string — will be normalized ("ko-KR" → "ko").
 */
export function getDnaAxisLabel(axis: DNAAxis | string, rawLocale: string | null | undefined): string {
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  if (typeof axis === "string" && isDnaAxis(axis)) {
    return DNA_AXIS_LABELS[axis][locale];
  }
  // Unknown axis: title-case the key so we never leak an all-lowercase token.
  const raw = String(axis ?? "");
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
}

/** Convenience accessor for the full label map (e.g. for OG images that need all 16 labels). */
export function getDnaAxisLabelMap(rawLocale: string | null | undefined): Record<DNAAxis, string> {
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  const out = {} as Record<DNAAxis, string>;
  for (const axis of DNA_AXES) {
    out[axis] = DNA_AXIS_LABELS[axis][locale];
  }
  return out;
}
