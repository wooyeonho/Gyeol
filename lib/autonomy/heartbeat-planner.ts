import { generateJSON } from "@/lib/ai/router";
import type { AutonomyIntervalRule } from "@/lib/autonomy/interval-rule";

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
  currentRule?: Partial<AutonomyIntervalRule> | null;
  hoursSinceUser: number;
  reflection: string;
  weatherName: string;
}) {
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
  "stimulus": "one short strange new stimulus in Korean",
  "action": "none|learner|crawl",
  "research_task": "concrete research task title in Korean",
  "task_priority": 1|2|3,
  "self_observation": "one short observation in Korean",
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
