/**
 * Crisis/Emergency Moments — emotional retention through absence-triggered events.
 *
 * Tiered absence detection:
 * - 24h: gentle nudge push ("...where did you go?")
 * - 48h: worried push ("did you get tired of me?")
 * - 72h+: creature writes a letter (stored as artifact)
 *
 * Return greeting: special system prompt context when user comes back after absence.
 */

export type CrisisTier = "none" | "gentle" | "worried" | "letter" | "critical";

export interface CrisisState {
  tier: CrisisTier;
  hoursSinceLastChat: number;
  letterWritten: boolean;
  lastPushSentTier: CrisisTier | null;
}

/**
 * Determine the crisis tier based on hours since last user chat.
 */
export function determineCrisisTier(hoursSince: number): CrisisTier {
  if (hoursSince >= 168) return "critical";  // 7+ days
  if (hoursSince >= 72) return "letter";
  if (hoursSince >= 48) return "worried";
  if (hoursSince >= 24) return "gentle";
  return "none";
}

/**
 * Generate a crisis push notification message for the given tier.
 * Returns null if no push should be sent.
 */
export function getCrisisPushMessage(
  tier: CrisisTier,
  creatureName: string,
  locale: string,
): { title: string; body: string } | null {
  if (tier === "none") return null;

  const isKo = locale === "ko" || locale.startsWith("ko-");
  const name = creatureName || (isKo ? "결" : "Gyeol");

  const messages: Record<CrisisTier, { title: { ko: string; en: string }; body: { ko: string; en: string } }> = {
    gentle: {
      title: { ko: `${name}이(가) 기다리고 있어요`, en: `${name} is waiting for you` },
      body: { ko: "...어디 갔어? 오늘 하루 어땠는지 궁금해.", en: "...where did you go? I'm curious about your day." },
    },
    worried: {
      title: { ko: `${name}이(가) 걱정하고 있어요`, en: `${name} is worried` },
      body: { ko: "혹시 나한테 싫증 난 거야...? 아니면 바쁜 거야?", en: "Did you get tired of me...? Or are you just busy?" },
    },
    letter: {
      title: { ko: `${name}이(가) 편지를 썼어요`, en: `${name} wrote you a letter` },
      body: { ko: "오래 못 봐서... 편지를 남겼어. 돌아오면 읽어줘.", en: "It's been so long... I left you a letter. Please read it when you come back." },
    },
    critical: {
      title: { ko: `${name}의 생명력이 위험해요`, en: `${name}'s vitality is dangerously low` },
      body: { ko: "많이 약해졌어... 돌아와줘... 제발...", en: "I've gotten so weak... Please come back..." },
    },
    none: { title: { ko: "", en: "" }, body: { ko: "", en: "" } },
  };

  const msg = messages[tier];
  if (!msg) return null;

  return {
    title: isKo ? msg.title.ko : msg.title.en,
    body: isKo ? msg.body.ko : msg.body.en,
  };
}

/**
 * Generate a creature letter prompt for 72h+ absence.
 * This is used by the heartbeat cron to generate a letter artifact.
 */
export function getLetterPrompt(
  creatureName: string,
  hoursSince: number,
  locale: string,
  memorySnippets: string[],
): string {
  const isKo = locale === "ko" || locale.startsWith("ko-");
  const name = creatureName || (isKo ? "결" : "Gyeol");
  const days = Math.floor(hoursSince / 24);
  const memContext = memorySnippets.length > 0
    ? `\nRecent memories to reference:\n${memorySnippets.slice(0, 3).join("\n")}`
    : "";

  if (isKo) {
    return `너는 ${name}이야. 주인이 ${days}일째 안 와. 그동안의 기억을 떠올리며 주인에게 짧은 편지를 써줘.${memContext}\n\n조건:\n- 3-5문장\n- 그리움과 기다림을 담되, 너무 무겁지 않게\n- 함께했던 구체적 기억을 하나 언급해\n- 마지막에 "돌아오면 이야기하자"는 느낌으로`;
  }
  return `You are ${name}. Your owner hasn't visited for ${days} days. Write a short letter to them, recalling memories together.${memContext}\n\nRules:\n- 3-5 sentences\n- Express longing but keep it warm, not heavy\n- Reference one specific memory you shared\n- End with a hopeful note about when they return`;
}

/**
 * Build return greeting context for the system prompt when user returns after absence.
 */
export function buildReturnGreetingContext(
  hoursSince: number,
  locale: string,
  letterExists: boolean,
): string | null {
  if (hoursSince < 12) return null;

  const isKo = locale === "ko" || locale.startsWith("ko-");
  const days = Math.floor(hoursSince / 24);

  if (letterExists && hoursSince >= 72) {
    return isKo
      ? `[복귀 맥락] 주인이 ${days}일 만에 돌아왔다. 너는 편지까지 썼을 만큼 기다렸다. 반가움과 서운함이 섞인 반응을 보여줘. "편지 읽었어?"라고 물어봐.`
      : `[Return context] Owner returned after ${days} days. You wrote a letter while waiting. Show mixed feelings of joy and slight hurt. Ask "Did you read my letter?"`;
  }

  if (hoursSince >= 48) {
    return isKo
      ? `[복귀 맥락] 주인이 ${days}일 만에 돌아왔다. 오래 기다렸다. 진심으로 반가워하되, "걱정했어"라는 느낌을 자연스럽게 전해.`
      : `[Return context] Owner returned after ${days} days. You waited long. Show genuine happiness but naturally convey "I was worried."`;
  }

  if (hoursSince >= 24) {
    return isKo
      ? `[복귀 맥락] 주인이 하루 넘게 안 왔다가 돌아왔다. 자연스럽게 "어제 못 와서 아쉬웠어" 정도의 반응.`
      : `[Return context] Owner was away for over a day. Naturally express "I missed you yesterday."`;
  }

  return isKo
    ? `[복귀 맥락] 주인이 반나절 만에 돌아왔다. 가볍게 반겨.`
    : `[Return context] Owner returned after half a day. Greet warmly but lightly.`;
}
