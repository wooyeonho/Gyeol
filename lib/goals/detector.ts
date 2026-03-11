type GoalSignal = {
  activeGoal: string | null;
  priority: 1 | 2 | 3;
  researchFocus: string | null;
};

const RESEARCH_HINTS = ["알아봐", "조사", "찾아", "비교", "추천", "정리해줘", "리서치"];
const GOAL_HINTS = ["목표", "계획", "하고 싶", "하고싶", "원해", "준비", "문제", "우선순위"];
const HIGH_PRIORITY_HINTS = ["급해", "빨리", "당장", "중요", "먼저", "긴급"];

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function clip(text: string, max = 120) {
  const normalized = normalize(text);
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function includesAny(text: string, hints: string[]) {
  return hints.some((hint) => text.includes(hint));
}

export function detectGoalSignal(message: string): GoalSignal {
  const text = normalize(message);
  if (text.length < 8) {
    return { activeGoal: null, priority: 1, researchFocus: null };
  }

  const researchFocus = includesAny(text, RESEARCH_HINTS) ? clip(text, 100) : null;
  const activeGoal = includesAny(text, GOAL_HINTS) || researchFocus ? clip(text, 100) : null;
  const priority: 1 | 2 | 3 = includesAny(text, HIGH_PRIORITY_HINTS) ? 3 : researchFocus ? 2 : activeGoal ? 2 : 1;

  return {
    activeGoal,
    priority,
    researchFocus,
  };
}
