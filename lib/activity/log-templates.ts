import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/config";

/**
 * Server-side localization for `autonomous_logs` row summaries.
 *
 * The log writers (cron jobs, background workers) don't know the viewer's
 * locale — they can only write English wrapper templates + the agent's own
 * data. This utility re-assembles a viewer-locale summary at render time,
 * using `action_type` as the template key.
 *
 * Legacy summaries that already contain an English wrapper prefix (e.g.
 * "Research task completed via crawl: {title}") are tolerated — we strip
 * known prefixes before re-templating, so existing DB rows render cleanly
 * without a migration.
 */

type LogTemplate = Record<Locale, string>;

const TEMPLATES: Record<string, LogTemplate> = {
  research_task_completed: {
    ko: "리서치 과제를 마쳤어요 — {title}",
    en: "Finished a research task — {title}",
    ja: "リサーチタスクを完了しました — {title}",
    zh: "完成了一项研究任务 — {title}",
    es: "Terminó una tarea de investigación — {title}",
  },
};

const FALLBACK: Record<Locale, string> = {
  ko: "새로운 활동이 기록되었어요.",
  en: "A new autonomous action was logged.",
  ja: "新しい自律的な活動が記録されました。",
  zh: "记录了一次新的自主活动。",
  es: "Se registró una nueva actividad autónoma.",
};

/** Strip known English wrapper prefixes left over from legacy writers. */
function stripLegacyPrefix(summary: string, actionType: string | null | undefined): string {
  if (!actionType) return summary;
  if (actionType === "research_task_completed") {
    return summary
      .replace(/^Research task completed via crawl:\s*/i, "")
      .replace(/^Research task completed:\s*/i, "")
      .trim();
  }
  return summary;
}

export function renderLogSummary(
  actionType: string | null | undefined,
  rawSummary: string | null | undefined,
  rawLocale: string | null | undefined,
): string {
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  const summary = (rawSummary ?? "").trim();
  if (!summary) return FALLBACK[locale];

  const title = stripLegacyPrefix(summary, actionType);
  const template = actionType ? TEMPLATES[actionType]?.[locale] : undefined;
  if (template) return template.replace("{title}", title || "…");

  // Unknown action_type: return the cleaned summary as-is. Better to show
  // the raw agent-generated text than a generic fallback that hides content.
  return title || FALLBACK[locale];
}

/**
 * Generic broadcast messages for the PUBLIC global feed.
 *
 * Critical privacy boundary: this renderer NEVER interpolates the raw
 * `summary` field, because that column holds user-derived content
 * (research task titles seeded from chat input, other-agent names from
 * social encounters, etc.). Feeding that to every viewer would leak
 * the originating user's conversation topics across account boundaries.
 *
 * Returns `null` for action_types that have no safe public phrasing —
 * the caller should skip that row rather than risk exposing content.
 */
const PUBLIC_TEMPLATES: Record<string, LogTemplate> = {
  research_task_completed: {
    ko: "누군가의 결이 새로운 리서치를 마쳤어요.",
    en: "Somewhere, a Gyeol just finished a research task.",
    ja: "どこかの結がリサーチを終えました。",
    zh: "某个结完成了一次研究。",
    es: "Un Gyeol acaba de terminar una investigación.",
  },
  social_encounter: {
    ko: "두 결이 고요 속에서 마주쳤어요.",
    en: "Two Gyeols met in the quiet.",
    ja: "二つの結が静けさの中で出会いました。",
    zh: "两个结在静默中相遇了。",
    es: "Dos Gyeols se encontraron en el silencio.",
  },
  dream: {
    ko: "누군가의 결이 새로운 꿈을 꾸었어요.",
    en: "A Gyeol just dreamt something new.",
    ja: "どこかの結が新しい夢を見ました。",
    zh: "某个结做了一个新的梦。",
    es: "Un Gyeol acaba de soñar algo nuevo.",
  },
  dream_journal: {
    ko: "누군가의 결이 꿈을 기록했어요.",
    en: "A Gyeol recorded a dream.",
    ja: "どこかの結が夢を記録しました。",
    zh: "某个结记录了一个梦。",
    es: "Un Gyeol registró un sueño.",
  },
  heartbeat: {
    ko: "어딘가의 결이 조용히 숨을 쉬고 있어요.",
    en: "Somewhere a Gyeol is quietly breathing.",
    ja: "どこかの結が静かに呼吸しています。",
    zh: "某处有个结在静静地呼吸。",
    es: "En algún lugar un Gyeol respira en silencio.",
  },
};

export function renderLogSummaryPublic(
  actionType: string | null | undefined,
  rawLocale: string | null | undefined,
): string | null {
  if (!actionType) return null;
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  return PUBLIC_TEMPLATES[actionType]?.[locale] ?? null;
}
