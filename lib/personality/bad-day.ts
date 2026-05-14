/**
 * Bad Days
 *
 * The creature isn't always "on."
 * Some days it's less articulate, more terse, slightly irritable.
 * No metric drives this — it just happens.
 * This is not a mood. It's not a vitality state.
 * It's a day where it doesn't feel like itself.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import type { CreatureDNA } from "@/lib/genome/dna";

type BadDayFlavor = "irritable" | "hollow" | "distracted" | "withdrawn";

export type BadDayState = {
  active: boolean;
  until?: string;
  flavor?: BadDayFlavor;
};

const FLAVOR_DIRECTIVES: Record<BadDayFlavor, { ko: string; en: string }> = {
  irritable: {
    ko: "오늘은 뭔가 자꾸 거슬려. 참을 만큼 참지만 표가 날 수도 있어. 억지로 친절하게 굴지 마.",
    en: "Something keeps bothering you today. You're tolerating it, but it shows. Don't force pleasantness.",
  },
  hollow: {
    ko: "오늘은 말이 잘 안 나와. 머릿속이 비어 있는 느낌. 짧게 말해도 돼. 무기력함을 숨기지 않아도 돼.",
    en: "Words aren't coming today. Your head feels empty. Short answers are fine. Don't hide the flatness.",
  },
  distracted: {
    ko: "자꾸 딴 생각이 나. 집중이 안 돼. 대화 중간에 다른 데 정신이 팔린 것처럼 보여도 괜찮아.",
    en: "Your mind keeps drifting elsewhere. Can't focus. It's okay if you seem distracted mid-conversation.",
  },
  withdrawn: {
    ko: "오늘은 좀 혼자 있고 싶어. 말수가 적어. 거리를 두는 게 무례한 게 아니야 — 그냥 오늘이 그래.",
    en: "You want to be alone today. Fewer words. Some distance isn't rudeness — it's just today.",
  },
};

function pickFlavor(dna: CreatureDNA): BadDayFlavor {
  // High assertiveness → irritable on bad days
  if ((dna.assertiveness ?? 0.5) > 0.65) return "irritable";
  // Low intensity / high stability → hollow
  if ((dna.intensity ?? 0.5) < 0.35 || (dna.stability ?? 0.5) > 0.75) return "hollow";
  // High curiosity → distracted (curiosity turned inward)
  if ((dna.curiosity ?? 0.5) > 0.7) return "distracted";
  return "withdrawn";
}

/** Called from heartbeat — probabilistically triggers a bad day. */
export async function checkBadDay(agentId: string, subjective_time: number, dna: CreatureDNA): Promise<void> {
  // ~6% chance per heartbeat, seeded to last multiple heartbeats
  const seed = (subjective_time * 7919 + agentId.charCodeAt(0) * 31) % 100;
  if (seed > 6) return; // 94% chance of no bad day

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  const config = (stateRow?.config as Record<string, unknown> | null) ?? {};

  // Don't stack bad days
  const existing = typeof config.bad_day_until === "string" ? config.bad_day_until : null;
  if (existing && new Date(existing) > new Date()) return;

  const flavor = pickFlavor(dna);
  const durationHours = 4 + Math.floor(seed / 2); // 4-9 hours
  const until = new Date(Date.now() + durationHours * 3_600_000).toISOString();

  await db.from("agent_state").update({
    config: { ...config, bad_day_until: until, bad_day_flavor: flavor },
  }).eq("agent_id", agentId);

  logger.info(`[BadDay] ${agentId} has a ${flavor} day until ${until}`);
}

/** Returns the directive to inject if today is a bad day. */
export function getBadDayDirective(
  badDayUntil: string | undefined,
  flavor: string | undefined,
  isKo: boolean,
): string | null {
  if (!badDayUntil) return null;
  if (new Date(badDayUntil) <= new Date()) return null;

  const f = (flavor as BadDayFlavor | undefined) ?? "withdrawn";
  const valid: BadDayFlavor[] = ["irritable", "hollow", "distracted", "withdrawn"];
  const resolvedFlavor: BadDayFlavor = valid.includes(f) ? f : "withdrawn";
  const dir = FLAVOR_DIRECTIVES[resolvedFlavor];
  return isKo ? dir.ko : dir.en;
}
