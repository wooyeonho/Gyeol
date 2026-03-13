import { generateJSON } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

type NextStepPlan = {
  active_goal?: string;
  identity_statement?: string;
  long_term_goal?: string;
  next_task?: string;
  priority?: 1 | 2 | 3;
  role_shift?: string;
  self_observation?: string;
};

export async function planNextResearchStep(input: {
  activeGoal?: string | null;
  completedTask: string;
  config?: unknown;
  locale?: string | null;
  resultSummary: string;
}) {
  const locale = resolveGenerationLocale({ config: input.config, explicitLocale: input.locale });
  const language = getLanguageName(locale);
  const result = await generateJSON<NextStepPlan>(
    "You are a long-term planning layer for an evolving AI being. Respond ONLY valid JSON.",
    `Current active goal: ${input.activeGoal ?? "none"}
Completed task: ${input.completedTask}
Result summary: ${input.resultSummary}

Return JSON with optional keys:
{
  "active_goal": "refined long-term goal in ${language}",
  "long_term_goal": "broader long-term direction in ${language}",
  "identity_statement": "one sentence of who you are becoming in ${language}",
  "next_task": "next concrete task in ${language}",
  "priority": 1|2|3,
  "role_shift": "a short ${language} role/identity shift statement",
  "self_observation": "a short ${language} self-observation"
}`
  );
  return result;
}
