/**
 * Single source of truth for all human-facing evolution / personality-shift text.
 *
 * Server events (dna_shift, trait_emerged, memory_*) bubble up through
 * chat-store → here → every consumer (message card, HUD badge, etc.).
 * Add new axes or traits here; no other file should contain locale-branched
 * evolution strings.
 */

export type TraitRef = { id: string; name: { ko: string; en: string } };

/**
 * Per-turn detail copy for message card annotations.
 * Picks the most specific string based on which DNA axes / traits changed.
 */
export function getEvolutionCopy(
  locale: string | undefined,
  dnaShift?: string[],
  traitEmerged?: TraitRef[]
): string {
  const isKo = locale?.startsWith("ko") ?? true;
  const axes = new Set(dnaShift ?? []);
  const traits = new Set((traitEmerged ?? []).map((t) => t.id));

  if (axes.has("curiosity"))
    return isKo ? "호기심이 조금 자랐어요" : "Curiosity grew a little.";
  if (axes.has("playfulness") || traits.has("trickster"))
    return isKo ? "더 장난스러워졌어요" : "A little more playful now.";
  if (axes.has("empathy") || axes.has("warmth") || traits.has("heart_reader"))
    return isKo ? "당신을 조금 더 신뢰해요" : "Trust grew a little.";
  if (traits.has("quiet_anchor") || axes.has("stability"))
    return isKo
      ? "조용하지만 더 깊이 반응하기 시작했어요"
      : "Quiet, but responding more deeply.";
  return isKo ? "새로운 성격 조짐이 보여요" : "New personality signs are showing.";
}

/**
 * Short summary string for the HUD growth badge (chat-panel pill).
 * Prioritises trait emergence > DNA shift > memory activity.
 */
export function deriveEvolutionSummary(
  locale: string | undefined,
  signals?: {
    dnaShift?: string[];
    traitEmerged?: TraitRef[];
    hasMemory?: boolean;
  }
): string {
  const isKo = locale?.startsWith("ko") ?? true;
  if (signals?.traitEmerged?.length)
    return isKo ? "새로운 성격 조짐" : "New personality signs";
  if (signals?.dnaShift?.length)
    return isKo ? "결이 조금 달라졌어요" : "Gyeol changed a little";
  return isKo ? "기억이 쌓이는 중" : "Memories are building";
}
