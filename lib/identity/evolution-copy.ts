type EvolutionSummary = "memory" | "curiosity" | "playful" | "trust" | "deep" | null;

type TraitLike = { id: string };

export function deriveEvolutionSummary(params: {
  hasMemoryMoment?: boolean;
  dnaShift?: string[];
  traitEmerged?: TraitLike[];
}): EvolutionSummary {
  if (params.hasMemoryMoment) return "memory";
  const axes = new Set(params.dnaShift ?? []);
  const traitIds = new Set((params.traitEmerged ?? []).map((trait) => trait.id));

  if (axes.has("curiosity")) return "curiosity";
  if (axes.has("playfulness") || traitIds.has("trickster")) return "playful";
  if (axes.has("empathy") || axes.has("warmth") || traitIds.has("heart_reader")) return "trust";
  if (axes.size > 0 || traitIds.size > 0) return "deep";
  return null;
}

export function getEvolutionCopy(summary: Exclude<EvolutionSummary, null>, locale: string): string {
  const isKo = locale.startsWith("ko");
  if (summary === "memory") return isKo ? "기억이 쌓이는 중" : "Memory is building";
  if (summary === "curiosity") return isKo ? "호기심이 조금 자랐어요" : "Curiosity grew a little";
  if (summary === "playful") return isKo ? "더 장난스러워졌어요" : "A little more playful";
  if (summary === "trust") return isKo ? "당신을 조금 더 신뢰해요" : "Trust grew a little";
  return isKo ? "조용하지만 더 깊이 반응하기 시작했어요" : "Quiet, but reacting more deeply";
}

