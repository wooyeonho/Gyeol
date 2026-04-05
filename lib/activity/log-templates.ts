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
