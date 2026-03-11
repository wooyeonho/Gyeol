export type AutonomyIntervalRule = {
  base_hours: number;
  lonely_hours: number;
  night_hours: number;
  low_vitality_hours: number;
  rationale?: string;
};

function clampHours(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(12, Math.max(1, Math.round(value)));
}

export function normalizeIntervalRule(input: Partial<AutonomyIntervalRule> | null | undefined): AutonomyIntervalRule {
  return {
    base_hours: clampHours(Number(input?.base_hours ?? 3), 3),
    lonely_hours: clampHours(Number(input?.lonely_hours ?? 2), 2),
    night_hours: clampHours(Number(input?.night_hours ?? 6), 6),
    low_vitality_hours: clampHours(Number(input?.low_vitality_hours ?? 5), 5),
    rationale: typeof input?.rationale === "string" ? input.rationale.slice(0, 180) : undefined,
  };
}

export function computeIntervalHours(params: {
  hoursSinceUser: number;
  phase: string;
  rule: Partial<AutonomyIntervalRule> | null | undefined;
  vitality: number;
}) {
  const rule = normalizeIntervalRule(params.rule);
  let interval = rule.base_hours;

  if (params.phase === "night") interval = Math.max(interval, rule.night_hours);
  if (params.hoursSinceUser >= 12) interval = Math.min(interval, rule.lonely_hours);
  if (params.vitality < 0.35) interval = Math.max(interval, rule.low_vitality_hours);

  return clampHours(interval, rule.base_hours);
}
