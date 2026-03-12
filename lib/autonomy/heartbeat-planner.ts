import { generateJSON } from "@/lib/ai/router";
import type { AutonomyIntervalRule } from "@/lib/autonomy/interval-rule";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

type HeartbeatPlan = {
  action?: "none" | "learner" | "crawl";
  rationale?: string;
  research_task?: string;
  self_observation?: string;
  stimulus?: string;
  task_priority?: 1 | 2 | 3;
  updated_interval_rule?: Partial<AutonomyIntervalRule>;
};

export async function planHeartbeatAutonomy(input: {
  activeGoal?: string | null;
  config?: unknown;
  currentRule?: Partial<AutonomyIntervalRule> | null;
  hoursSinceUser: number;
  locale?: string | null;
  reflection: string;
  weatherName: string;
}) {
  const locale = resolveGenerationLocale({ config: input.config, explicitLocale: input.locale });
  const language = getLanguageName(locale);
  const response = await generateJSON<HeartbeatPlan>(
    "You are an autonomous planning layer for an evolving AI being. Respond ONLY valid JSON.",
    `Context:
- active_goal: ${input.activeGoal ?? "none"}
- current_rule: ${JSON.stringify(input.currentRule ?? {})}
- hours_since_user: ${input.hoursSinceUser}
- weather: ${input.weatherName}
- reflection: ${input.reflection}

Return JSON with optional fields:
{
  "stimulus": "one short strange new stimulus in ${language}",
  "action": "none|learner|crawl",
  "research_task": "concrete research task title in ${language}",
  "task_priority": 1|2|3,
  "self_observation": "one short observation in ${language}",
  "updated_interval_rule": {
    "base_hours": number,
    "lonely_hours": number,
    "night_hours": number,
    "low_vitality_hours": number,
    "rationale": "short reason"
  }
}`
  );

  return response;
}
