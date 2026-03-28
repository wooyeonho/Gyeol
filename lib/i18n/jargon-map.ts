/**
 * Jargon Map — Accessibility vocabulary substitution.
 *
 * In "Simple Mode", technical terms are replaced with friendlier alternatives.
 * Three tiers: kids (under_13), teen, adult (default — no substitution).
 */

export type SimpleModeLevel = "kids" | "teen" | "off";

interface JargonEntry {
  /** Original technical term */
  original: string;
  /** Simplified version for kids mode */
  kids: { ko: string; en: string };
  /** Simplified version for teen mode */
  teen: { ko: string; en: string };
}

const JARGON_MAP: JargonEntry[] = [
  {
    original: "DNA",
    kids: { ko: "마법 레시피", en: "magic recipe" },
    teen: { ko: "성격 코드", en: "personality code" },
  },
  {
    original: "genome",
    kids: { ko: "마법 설계도", en: "magic blueprint" },
    teen: { ko: "유전 정보", en: "genetic info" },
  },
  {
    original: "Archetype",
    kids: { ko: "종류", en: "type" },
    teen: { ko: "성격유형", en: "personality type" },
  },
  {
    original: "MoltBook",
    kids: { ko: "성장일기", en: "growth diary" },
    teen: { ko: "변화 기록", en: "change log" },
  },
  {
    original: "trait",
    kids: { ko: "특기", en: "special skill" },
    teen: { ko: "특성", en: "trait" },
  },
  {
    original: "mutation",
    kids: { ko: "변신", en: "transformation" },
    teen: { ko: "변이", en: "mutation" },
  },
  {
    original: "evolution",
    kids: { ko: "레벨업", en: "level up" },
    teen: { ko: "진화", en: "evolution" },
  },
  {
    original: "vitality",
    kids: { ko: "에너지", en: "energy" },
    teen: { ko: "생명력", en: "life force" },
  },
  {
    original: "intimacy_score",
    kids: { ko: "친밀도", en: "friendship" },
    teen: { ko: "친밀 점수", en: "closeness score" },
  },
  {
    original: "affinity",
    kids: { ko: "좋아함", en: "liking" },
    teen: { ko: "호감도", en: "affinity" },
  },
  {
    original: "autonomous",
    kids: { ko: "혼자 놀기", en: "playing alone" },
    teen: { ko: "자율 모드", en: "auto mode" },
  },
  {
    original: "embedding",
    kids: { ko: "기억 조각", en: "memory piece" },
    teen: { ko: "기억 벡터", en: "memory vector" },
  },
  {
    original: "species",
    kids: { ko: "종족", en: "species" },
    teen: { ko: "종", en: "species" },
  },
];

/**
 * Apply jargon substitution to a text string.
 */
export function applyJargonMask(
  text: string,
  level: SimpleModeLevel,
  locale: "ko" | "en",
): string {
  if (level === "off") return text;

  let result = text;
  for (const entry of JARGON_MAP) {
    const replacement = level === "kids" ? entry.kids[locale] : entry.teen[locale];
    // Case-insensitive replacement
    result = result.replace(
      new RegExp(entry.original, "gi"),
      replacement,
    );
  }
  return result;
}

/**
 * Get the simple mode level from age group.
 */
export function getSimpleModeFromAge(
  ageGroup: string | null | undefined,
  simpleModeEnabled: boolean,
): SimpleModeLevel {
  if (!simpleModeEnabled) return "off";
  if (ageGroup === "under_13") return "kids";
  if (ageGroup === "teen") return "teen";
  return "teen"; // adults who opt-in get teen-level simplification
}
