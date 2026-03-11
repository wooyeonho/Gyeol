type ResearchTaskLike = {
  attempt_count?: number | null;
  created_at?: string | null;
  last_attempted_at?: string | null;
  priority?: number | null;
  result_summary?: string | null;
  title?: string | null;
};

function clampPriority(value: number) {
  return Math.max(1, Math.min(3, value));
}

export function computeEffectivePriority(task: ResearchTaskLike) {
  const basePriority = clampPriority(Number(task.priority ?? 1));
  const attempts = Number(task.attempt_count ?? 0);
  const untouchedBonus = attempts === 0 ? 1 : 0;
  const staleBonus =
    task.last_attempted_at && Date.now() - new Date(task.last_attempted_at).getTime() > 24 * 3600000
      ? 1
      : 0;
  return clampPriority(basePriority + untouchedBonus + staleBonus);
}

export function sortResearchTasks<T extends ResearchTaskLike>(tasks: T[]) {
  return [...tasks].sort((a, b) => {
    const priorityDiff = computeEffectivePriority(b) - computeEffectivePriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    const aAttempt = a.last_attempted_at ? new Date(a.last_attempted_at).getTime() : 0;
    const bAttempt = b.last_attempted_at ? new Date(b.last_attempted_at).getTime() : 0;
    if (aAttempt !== bAttempt) return aAttempt - bAttempt;
    return new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime();
  });
}

export function buildTaskNextAction(task: ResearchTaskLike | null, activeGoal: string | null) {
  if (task?.result_summary) {
    return `최근 조사한 "${task.title}" 결과를 바탕으로 다음 실행 계획을 요청해보세요.`;
  }
  if (task?.title) {
    return `지금은 "${task.title}"를 이어서 정리하거나 조사하도록 결에게 요청해보세요.`;
  }
  if (activeGoal) {
    return `현재 목표인 "${activeGoal}"를 기준으로 다음 행동을 한 단계 더 쪼개보세요.`;
  }
  return "다음 목표나 조사 포인트를 한 줄로 적으면 결이 이어서 기억합니다.";
}

export function extractTaskKeywords(title: string | null | undefined) {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 8);
}
