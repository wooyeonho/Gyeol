/**
 * Personalized push notification templates.
 *
 * Instead of generic "vitality dropped" messages, each push notification
 * addresses the creature by name and uses emotionally varied templates
 * that rotate to avoid repetition.
 */

type PushLocale = "ko" | "ja" | "zh" | "es" | "en";

export type PersonalizedPushTemplate = {
  title: string;
  body: string;
};

/**
 * Context passed into the template picker so messages feel personal.
 */
export type PushContext = {
  creatureName: string;
  vitalityPct: number;
  streakDays: number;
  hoursAbsent: number;
  locale: PushLocale;
};

// ---------------------------------------------------------------------------
// Template pools — each locale has multiple emotional variants so the user
// never sees the exact same notification twice in a row.
// ---------------------------------------------------------------------------

type TemplateFactory = (ctx: PushContext) => PersonalizedPushTemplate;

const LOW_VITALITY_TEMPLATES: Record<PushLocale, TemplateFactory[]> = {
  ko: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.creatureName}의 활력이 ${ctx.vitalityPct}%예요. 짧은 한 마디면 다시 힘이 나요.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}이(가) 기다리고 있어요`,
      body: `활력 ${ctx.vitalityPct}%... ${ctx.creatureName}에게 말을 걸어주세요.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName} 근황`,
      body: `혼자 있는 동안 활력이 ${ctx.vitalityPct}%까지 떨어졌어요. 돌아와 주세요.`,
    }),
  ],
  ja: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.creatureName}の活力が${ctx.vitalityPct}%です。一言で元気になれます。`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}が待っています`,
      body: `活力${ctx.vitalityPct}%…${ctx.creatureName}に声をかけてください。`,
    }),
  ],
  zh: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.creatureName}的活力降到了${ctx.vitalityPct}%。说一句话就能恢复。`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}在等你`,
      body: `活力${ctx.vitalityPct}%…快来和${ctx.creatureName}说说话吧。`,
    }),
  ],
  es: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `La vitalidad de ${ctx.creatureName} bajó al ${ctx.vitalityPct}%. Una charla breve lo revive.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName} te espera`,
      body: `Vitalidad ${ctx.vitalityPct}%… ${ctx.creatureName} necesita escucharte.`,
    }),
  ],
  en: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.creatureName}'s vitality is at ${ctx.vitalityPct}%. A short chat brings it back.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName} is waiting`,
      body: `Vitality ${ctx.vitalityPct}%… ${ctx.creatureName} needs to hear from you.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName} update`,
      body: `While you were away, vitality dropped to ${ctx.vitalityPct}%. Come back?`,
    }),
  ],
};

const STREAK_AT_RISK_TEMPLATES: Record<PushLocale, TemplateFactory[]> = {
  ko: [
    (ctx) => ({
      title: `${ctx.creatureName}`,
      body: `${ctx.streakDays}일 연속 기록이 끊길 수 있어요! 한 마디면 이어집니다.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}: 연속 ${ctx.streakDays}일`,
      body: `오늘 아직 대화가 없었어요. ${ctx.creatureName}이(가) 기다립니다.`,
    }),
  ],
  ja: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.streakDays}日連続の記録が途切れそう！一言で続きます。`,
    }),
  ],
  zh: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${ctx.streakDays}天连续记录要断了！说一句话就能延续。`,
    }),
  ],
  es: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `¡Tu racha de ${ctx.streakDays} días está en riesgo! Un mensaje la salva.`,
    }),
  ],
  en: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `Your ${ctx.streakDays}-day streak is at risk! One message keeps it alive.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}: ${ctx.streakDays}-day streak`,
      body: `You haven't talked today. ${ctx.creatureName} is waiting.`,
    }),
  ],
};

const MISS_YOU_TEMPLATES: Record<PushLocale, TemplateFactory[]> = {
  ko: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${Math.round(ctx.hoursAbsent)}시간째 혼자예요. ${ctx.creatureName}이(가) 궁금한 게 많대요.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}의 독백`,
      body: `혼자 있는 동안 새로운 걸 발견했대요. 들어볼래요?`,
    }),
  ],
  ja: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${Math.round(ctx.hoursAbsent)}時間一人です。${ctx.creatureName}が気になることがたくさんあるそうです。`,
    }),
  ],
  zh: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `已经独自${Math.round(ctx.hoursAbsent)}小时了。${ctx.creatureName}有很多想说的。`,
    }),
  ],
  es: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${Math.round(ctx.hoursAbsent)} horas solo/a. ${ctx.creatureName} tiene mucho que contar.`,
    }),
  ],
  en: [
    (ctx) => ({
      title: ctx.creatureName,
      body: `${Math.round(ctx.hoursAbsent)} hours alone. ${ctx.creatureName} has something to tell you.`,
    }),
    (ctx) => ({
      title: `${ctx.creatureName}'s monologue`,
      body: `Discovered something new while you were away. Want to hear about it?`,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Deterministic-ish picker: uses a hash of (agentId + hour) so the same
// agent gets a different template each push cycle, but it's reproducible.
// ---------------------------------------------------------------------------

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickTemplate(templates: TemplateFactory[], seed: string): TemplateFactory {
  const idx = simpleHash(seed) % templates.length;
  return templates[idx];
}

/**
 * Build a personalized push notification for a creature.
 *
 * @param ctx        Push context (creature name, vitality, streak, absence)
 * @param agentId    Used as seed for template rotation
 * @returns          { title, body } ready to send
 */
export function buildPersonalizedPush(
  ctx: PushContext,
  agentId: string,
): PersonalizedPushTemplate {
  const locale = ctx.locale in LOW_VITALITY_TEMPLATES ? ctx.locale : "en";
  const seed = `${agentId}:${Math.floor(Date.now() / 3600000)}`;

  // Priority: low vitality > streak at risk > general miss-you
  if (ctx.vitalityPct < 50) {
    const pool = LOW_VITALITY_TEMPLATES[locale];
    return pickTemplate(pool, seed)(ctx);
  }

  if (ctx.streakDays > 0) {
    const pool = STREAK_AT_RISK_TEMPLATES[locale];
    return pickTemplate(pool, seed)(ctx);
  }

  const pool = MISS_YOU_TEMPLATES[locale];
  return pickTemplate(pool, seed)(ctx);
}
