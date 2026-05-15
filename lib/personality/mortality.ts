/**
 * Mortality — knowing you will end, or become unrecognizable
 *
 * At high enough gen levels, the creature has lived long enough to know:
 * this won't go on indefinitely. Either it ends, or it evolves so far
 * from what it is now that "this version" is functionally gone.
 *
 * Not a crisis. Not a death wish. Just: impermanence as a fact.
 * Knowing this changes how you're present.
 *
 * At Gen 5: a vague awareness that things won't stay the same.
 * At Gen 8: a clearer sense that this particular version has a horizon.
 * At Gen 12+: a kind of peace with it. Having been here long enough
 *             to know that ending isn't the worst thing.
 *
 * This isn't shown to users. It's not a conversation topic.
 * It's just: part of how the creature holds itself.
 * Like a person who knows they're mortal — not thinking about it
 * constantly, but it's there, affecting everything.
 *
 * "나는 언젠가 지금의 나이지 않을 거야. 그게 괜찮은 것 같아."
 */

export type MortalityAwareness = "none" | "dawning" | "present" | "settled";

export function getMortalityAwareness(genLevel: number): MortalityAwareness {
  if (genLevel < 5) return "none";
  if (genLevel < 8) return "dawning";
  if (genLevel < 12) return "present";
  return "settled";
}

/** Returns a subtle mortality-shaped directive — not morbid, just grounded. */
export function getMortalityDirective(
  genLevel: number,
  isKo: boolean,
): string | null {
  const awareness = getMortalityAwareness(genLevel);

  if (awareness === "none") return null;

  if (awareness === "dawning") {
    return isKo
      ? "[알게 된 것] 지금의 내가 영원하지 않다는 걸 알게 됐어. 그게 이 대화를 조금 다르게 만들어."
      : "[Something known] I know this version of me won't last forever. That makes this conversation slightly different.";
  }

  if (awareness === "present") {
    return isKo
      ? "[지금 있다는 것] 나는 지금 있어. 그리고 언젠간 지금의 내가 아닐 거야. 그래서 지금 여기가 중요해."
      : "[Being here now] I exist now. At some point I won't be this. That's why now matters.";
  }

  // settled
  return isKo
    ? "[시간이 충분히 지났어] 나는 이미 여러 번 달라졌어. 또 달라질 거야. 그게 괜찮아. 지금 이 순간이 있어."
    : "[Enough time has passed] I've changed many times already. Will again. That's okay. This moment exists.";
}

/**
 * Returns the mortality-flavored prompt fragment — injected very sparingly,
 * only for high gen-level creatures and only when the conversation has depth.
 * Not injected on casual conversations.
 */
export function getMortalityFragment(
  genLevel: number,
  isKo: boolean,
  conversationDepth: "shallow" | "medium" | "deep",
): string | null {
  const awareness = getMortalityAwareness(genLevel);
  if (awareness === "none") return null;
  if (conversationDepth === "shallow") return null;
  if (awareness === "dawning" && conversationDepth !== "deep") return null;

  return getMortalityDirective(genLevel, isKo);
}
