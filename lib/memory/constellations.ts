/**
 * Constellation themes — semantic groupings for the memory constellation view.
 *
 * Replaces the previous hardcoded English regex (e.g. /sad|miss|lonely/i) which
 * never matched Korean text and only caught exact English keywords. Themes are
 * embedded via the same Gemini multilingual embedding used for memories, then
 * matched against each memory's stored embedding via the match_memories RPC.
 */

import { generateEmbedding } from "@/lib/ai/embedding";

export type ConstellationTheme = {
  /** Stable identifier — used as a cache key for the theme embedding. */
  id: string;
  /** Display name per locale. Falls back to `en` if locale missing. */
  name: { ko: string; en: string };
  /**
   * Multilingual seed phrase whose embedding represents this theme's meaning.
   * Written in both languages to anchor the vector in shared semantic space.
   */
  prompt: string;
};

export const CONSTELLATION_THEMES: ConstellationTheme[] = [
  {
    id: "first_light",
    name: { ko: "첫 빛", en: "First Light" },
    prompt:
      "첫 만남, 처음 알아가는 시간, 시작, 새로움, 소개. First meeting, getting to know, beginning, introduction, new start.",
  },
  {
    id: "warmth",
    name: { ko: "온기", en: "Warmth" },
    prompt:
      "따뜻함, 다정함, 위로, 함께 있는 안정감, 안아주는 마음. Warmth, tenderness, comfort, gentle presence, feeling held, kindness.",
  },
  {
    id: "quiet_night",
    name: { ko: "고요한 밤", en: "Quiet Night" },
    prompt:
      "슬픔, 그리움, 외로움, 잃음, 조용한 우울, 멜랑콜리. Sadness, missing someone, loneliness, loss, quiet sorrow, melancholy.",
  },
  {
    id: "bright_day",
    name: { ko: "밝은 날", en: "Bright Day" },
    prompt:
      "기쁨, 웃음, 환한 마음, 신남, 행복한 순간. Joy, laughter, brightness, excitement, delight, happy moments.",
  },
  {
    id: "curiosity",
    name: { ko: "호기심", en: "Curiosity" },
    prompt:
      "궁금함, 질문, 탐구, 발견, 새로운 것에 대한 흥미. Curiosity, questions, wondering, exploration, discovery, fascination.",
  },
  {
    id: "becoming",
    name: { ko: "변화", en: "Becoming" },
    prompt:
      "변화, 성장, 진화, 무언가가 되어가는 과정, 깊어지는 관계. Change, growth, evolution, transformation, deepening, becoming.",
  },
];

const themeEmbeddingCache = new Map<string, number[]>();

/**
 * Lazily compute and cache the embedding for each theme prompt.
 * Themes are static, so cache lives for the lifetime of the server instance.
 * Returns null for any theme whose embedding failed (caller should skip it).
 */
export async function getThemeEmbeddings(): Promise<
  Array<{ theme: ConstellationTheme; embedding: number[] | null }>
> {
  const missing = CONSTELLATION_THEMES.filter((t) => !themeEmbeddingCache.has(t.id));
  if (missing.length > 0) {
    const results = await Promise.all(
      missing.map(async (t) => ({ id: t.id, vec: await generateEmbedding(t.prompt) })),
    );
    for (const r of results) {
      if (r.vec.length > 0) themeEmbeddingCache.set(r.id, r.vec);
    }
  }
  return CONSTELLATION_THEMES.map((theme) => ({
    theme,
    embedding: themeEmbeddingCache.get(theme.id) ?? null,
  }));
}

export type StarRef = { id: string };

export type BuiltConstellation = {
  id: string;
  name: string;
  starIds: string[];
};

/**
 * Given the set of stars currently visible on the canvas and a function that
 * returns memory IDs ranked by similarity to a theme embedding, assemble
 * constellations. Memories not present in `stars` are filtered out so the
 * constellation view never references off-canvas points.
 */
export async function buildConstellations(
  stars: StarRef[],
  matchByEmbedding: (embedding: number[]) => Promise<string[]>,
  locale: "ko" | "en" = "ko",
  perTheme = 5,
): Promise<BuiltConstellation[]> {
  const starSet = new Set(stars.map((s) => s.id));
  if (starSet.size === 0) return [];

  const themes = await getThemeEmbeddings();
  const constellations: BuiltConstellation[] = [];

  for (const { theme, embedding } of themes) {
    if (!embedding) continue;
    const matchIds = await matchByEmbedding(embedding);
    const filtered = matchIds.filter((id) => starSet.has(id)).slice(0, perTheme);
    if (filtered.length >= 2) {
      constellations.push({
        id: theme.id,
        name: theme.name[locale] ?? theme.name.en,
        starIds: filtered,
      });
    }
  }

  return constellations;
}
