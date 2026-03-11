import { generateJSON } from "@/lib/ai/router";

type NextStepPlan = {
  active_goal?: string;
  next_task?: string;
  priority?: 1 | 2 | 3;
  role_shift?: string;
  self_observation?: string;
};

export async function planNextResearchStep(input: {
  activeGoal?: string | null;
  completedTask: string;
  resultSummary: string;
}) {
  const result = await generateJSON<NextStepPlan>(
    "You are a long-term planning layer for an evolving AI being. Respond ONLY valid JSON.",
    `Current active goal: ${input.activeGoal ?? "none"}
Completed task: ${input.completedTask}
Result summary: ${input.resultSummary}

Return JSON with optional keys:
{
  "active_goal": "refined long-term goal in Korean",
  "next_task": "next concrete task in Korean",
  "priority": 1|2|3,
  "role_shift": "a short Korean role/identity shift statement",
  "self_observation": "a short Korean self-observation"
}`
  );
  return result;
}
