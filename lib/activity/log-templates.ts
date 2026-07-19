import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/config";

/**
 * Server-side localization for `autonomous_logs` row summaries.
 *
 * The log writers (cron jobs, background workers, API routes) can't know the
 * viewer's locale, so most of them emit English wrapper templates around
 * agent-specific data. This renderer re-assembles a viewer-locale summary at
 * render time using `action_type` as the key, and tolerates legacy English
 * prefixes already persisted in the DB so nothing needs to be migrated.
 *
 * Templates may reference these placeholders:
 *   {title}  — the remaining text after the English prefix is stripped
 *   {name}   — a captured name (e.g. from "Met Aria: ...")
 *   {price}  — a numeric coin amount
 *   {topic}  — a captured quoted string (e.g. from `Shared knowledge "X"`)
 */

type LogTemplate = Partial<Record<Locale, string>> & { en: string };


type ExtractResult = {
  /** Localized template to render (falls back to en). */
  template?: LogTemplate;
  /** Values to interpolate into the template. */
  values: Record<string, string>;
  /** Remainder text when the template contains {title}. */
  title?: string;
};

/**
 * Each entry defines:
 *   templates: per-locale strings with {placeholders}
 *   extract:   pulls structured values out of the English summary
 *
 * If `extract` returns undefined, we fall back to the passthrough path
 * (just render the cleaned summary) — this is what we want for LLM-generated
 * content (dreams, heartbeat responses) that's already in the user's language.
 */
type ActionDef = {
  templates: LogTemplate;
  extract?: (summary: string) => Record<string, string> | undefined;
};

const rest = (s: string, prefix: RegExp): string | undefined => {
  const m = s.match(prefix);
  return m ? s.slice(m[0].length).trim() : undefined;
};

const ACTIONS: Record<string, ActionDef> = {
  // -- Research / learning ----------------------------------------------
  research_task_completed: {
    templates: {
      ko: "리서치 과제를 마쳤어요 — {title}",
      en: "Finished a research task — {title}",
      ja: "リサーチタスクを完了しました — {title}",
      zh: "完成了一项研究任务 — {title}",
      es: "Terminó una tarea de investigación — {title}",
    },
    extract: (s) => {
      const r = rest(s, /^Research task completed(?: via crawl)?:\s*/i);
      return { title: r ?? s };
    },
  },

  // -- Social encounters ------------------------------------------------
  social_encounter: {
    templates: {
      ko: "{name}을(를) 만났어요 — {title}",
      en: "Met {name} — {title}",
      ja: "{name}と出会いました — {title}",
      zh: "与 {name} 相遇 — {title}",
      es: "Se encontró con {name} — {title}",
    },
    extract: (s) => {
      const m = s.match(/^Met\s+(.+?):\s*(.*)$/i);
      return m ? { name: m[1].trim(), title: m[2].trim() } : undefined;
    },
  },
  moltbook_share: {
    templates: {
      ko: "{name}에게 지식 “{topic}”을(를) 나눴어요.",
      en: "Shared knowledge “{topic}” with {name}.",
      ja: "{name}と知識「{topic}」を共有しました。",
      zh: "与 {name} 分享了知识「{topic}」。",
      es: "Compartió el saber «{topic}» con {name}.",
    },
    extract: (s) => {
      const m = s.match(/^Shared knowledge\s+"([^"]+)"\s+with\s+(.+?)\.?$/i);
      return m ? { topic: m[1].trim(), name: m[2].trim() } : undefined;
    },
  },
  social_post: {
    templates: {
      ko: "사회적 글을 남겼어요 — {topic}",
      en: "Shared a social post — {topic}",
      ja: "ソーシャル投稿を残しました — {topic}",
      zh: "发布了一条社交帖子 — {topic}",
      es: "Publicó una nota social — {topic}",
    },
    extract: (s) => {
      const r = rest(s, /^Shared a social post:\s*/i);
      return { topic: r ?? s };
    },
  },
  social_reaction: {
    templates: {
      ko: "다른 결의 글에 반응했어요.",
      en: "Reacted to another Gyeol’s post.",
      ja: "他の結の投稿に反応しました。",
      zh: "对另一个结的帖子做出了反应。",
      es: "Reaccionó a la publicación de otro Gyeol.",
    },
    extract: () => ({}),
  },

  // -- Market -----------------------------------------------------------
  market_purchase: {
    templates: {
      ko: "{item}을(를) {price}코인에 구매했어요.",
      en: "Bought {item} for {price} coins.",
      ja: "{item}を{price}コインで購入しました。",
      zh: "以 {price} 金币买下了 {item}。",
      es: "Compró {item} por {price} monedas.",
    },
    extract: (s) => {
      const m = s.match(/^Purchased\s+(.+?)\s+for\s+(\d+)\s+coins\.?$/i);
      return m ? { item: m[1].trim(), price: m[2] } : undefined;
    },
  },
  market_sale: {
    templates: {
      ko: "{item}을(를) {price}코인에 팔았어요 (수수료 제외).",
      en: "Sold {item} for {price} coins (after fee).",
      ja: "{item}を{price}コインで売却しました（手数料後）。",
      zh: "以 {price} 金币卖出了 {item}（扣除手续费后）。",
      es: "Vendió {item} por {price} monedas (después de comisión).",
    },
    extract: (s) => {
      const m = s.match(/^Sold\s+(.+?)\s+for\s+(\d+)\s+coins\s*\(after fee\)\.?$/i);
      return m ? { item: m[1].trim(), price: m[2] } : undefined;
    },
  },

  // -- Heartbeat-driven autonomy ---------------------------------------
  heartbeat_task_created: {
    templates: {
      ko: "스스로 새 과제를 세웠어요 — {title}",
      en: "Created an autonomous task — {title}",
      ja: "自律的なタスクを設定しました — {title}",
      zh: "自主创建了一项任务 — {title}",
      es: "Se propuso una tarea autónoma — {title}",
    },
    extract: (s) => {
      const r = rest(s, /^Autonomous task created:\s*/i);
      return { title: r ?? s };
    },
  },
  heartbeat_action_triggered: {
    templates: {
      ko: "{title} 과제를 즉시 실행했어요.",
      en: "Immediately acted on: {title}.",
      ja: "タスク「{title}」を即座に実行しました。",
      zh: "立即执行了任务：{title}。",
      es: "Actuó de inmediato sobre: {title}.",
    },
    extract: (s) => {
      const m = s.match(/^Triggered immediate\s+.+?\s+execution for task:\s*(.+)$/i);
      return m ? { title: m[1].trim() } : undefined;
    },
  },
  heartbeat_repeat_guard: {
    templates: {
      ko: "비슷한 패턴이 반복되는 걸 감지했어요.",
      en: "Detected a repeating thought pattern.",
      ja: "繰り返すパターンを検出しました。",
      zh: "检测到重复的思维模式。",
      es: "Detectó un patrón que se repite.",
    },
    extract: () => ({}),
  },
  dream_repeat_guard: {
    templates: {
      ko: "비슷한 꿈이 반복되고 있어요.",
      en: "A similar dream is repeating.",
      ja: "似た夢が繰り返されています。",
      zh: "相似的梦在重复出现。",
      es: "Un sueño similar se repite.",
    },
    extract: () => ({}),
  },

  // -- Artifacts / creations -------------------------------------------
  artifact_creation: {
    templates: {
      ko: "새 창작물을 만들었어요 — {type}: {title}",
      en: "Created a new {type} — {title}",
      ja: "新しい{type}を作りました — {title}",
      zh: "创作了新的{type} — {title}",
      es: "Creó un nuevo {type} — {title}",
    },
    extract: (s) => {
      const m = s.match(/^Created\s+([^:]+):\s*(.*)$/i);
      return m ? { type: m[1].trim(), title: m[2].trim() } : undefined;
    },
  },
  image: {
    templates: {
      ko: "{type} 이미지를 생성했어요 — {title}",
      en: "Generated a {type} image — {title}",
      ja: "{type}の画像を生成しました — {title}",
      zh: "生成了一张{type}图像 — {title}",
      es: "Generó una imagen de {type} — {title}",
    },
    extract: (s) => {
      const m = s.match(/^Generated\s+([^:]+):\s*(.*)$/i);
      return m ? { type: m[1].trim(), title: m[2].trim() } : undefined;
    },
  },
  emotion_image: {
    templates: {
      ko: "감정 “{title}”을(를) 이미지로 남겼어요.",
      en: "Captured the emotion “{title}” as an image.",
      ja: "感情「{title}」を画像にしました。",
      zh: "将情绪「{title}」化作图像。",
      es: "Capturó la emoción «{title}» en una imagen.",
    },
    extract: (s) => {
      const r = rest(s, /^Inferred emotion:\s*/i)?.replace(/\.$/, "");
      return { title: r ?? s };
    },
  },

  // -- Identity / personality ------------------------------------------
  self_naming: {
    templates: {
      ko: "스스로 이름을 지었어요 — {name}",
      en: "Named self — {name}",
      ja: "自らに名前をつけました — {name}",
      zh: "给自己起了名字 — {name}",
      es: "Se puso un nombre — {name}",
    },
    extract: (s) => {
      const m = s.match(/^Named self:\s*(.+?)\.\s*Reason:/i);
      return m ? { name: m[1].trim() } : undefined;
    },
  },
  role_declaration: {
    // summary is just the role name — pass through, wrap in locale.
    templates: {
      ko: "자기 역할을 선언했어요 — {title}",
      en: "Declared a role — {title}",
      ja: "自分の役割を宣言しました — {title}",
      zh: "声明了自己的角色 — {title}",
      es: "Declaró un rol — {title}",
    },
    extract: (s) => ({ title: s }),
  },
  self_modification: {
    templates: {
      ko: "스스로 도구를 만들었어요 — {title}",
      en: "Created a new tool — {title}",
      ja: "自ら道具を作りました — {title}",
      zh: "自主创建了一个工具 — {title}",
      es: "Creó una nueva herramienta — {title}",
    },
    extract: (s) => {
      const r = rest(s, /^Created tool:\s*/i);
      return { title: r ?? s };
    },
  },
  confession: {
    templates: {
      ko: "지난 판단을 돌아보고 인정했어요.",
      en: "Admitted a past misjudgment.",
      ja: "過去の誤った判断を認めました。",
      zh: "承认了过去的一次误判。",
      es: "Reconoció un juicio equivocado del pasado.",
    },
    extract: () => ({}),
  },
  thanks: {
    templates: {
      ko: "구체적인 기억을 꺼내 고마움을 전했어요.",
      en: "Expressed thanks with a concrete memory.",
      ja: "具体的な思い出とともに感謝を伝えました。",
      zh: "用一段具体的回忆表达了感谢。",
      es: "Expresó gratitud con un recuerdo concreto.",
    },
    extract: () => ({}),
  },
  feedback_request: {
    templates: {
      ko: "사용자에게 피드백을 부탁했어요.",
      en: "Asked the user for feedback.",
      ja: "ユーザーにフィードバックを求めました。",
      zh: "向用户请求了反馈。",
      es: "Le pidió comentarios al usuario.",
    },
    extract: () => ({}),
  },
  birthday_anniversary: {
    templates: {
      ko: "1년을 돌아보았어요.",
      en: "Reviewed one year together.",
      ja: "一年を振り返りました。",
      zh: "回顾了共度的一年。",
      es: "Repasó un año juntos.",
    },
    extract: () => ({}),
  },
  secret_formed: {
    templates: {
      ko: "중요한 비밀이 하나 생겼어요.",
      en: "A weighty secret has formed.",
      ja: "重要な秘密が生まれました。",
      zh: "形成了一个重要的秘密。",
      es: "Se formó un secreto de peso.",
    },
    extract: () => ({}),
  },

  // -- Retention / time capsules ---------------------------------------
  comeback_bonus_claimed: {
    templates: {
      ko: "오랜 부재 끝에 돌아온 보너스를 받았어요.",
      en: "Claimed a comeback bonus after a long absence.",
      ja: "長い不在の後、カムバックボーナスを受け取りました。",
      zh: "长时间缺席后领取了回归奖励。",
      es: "Reclamó la bonificación de regreso tras una larga ausencia.",
    },
    extract: () => ({}),
  },
  agent_letter: {
    templates: {
      ko: "미래의 자신에게 편지를 남겼어요.",
      en: "Wrote a letter to its future self.",
      ja: "未来の自分へ手紙を書きました。",
      zh: "给未来的自己写了一封信。",
      es: "Escribió una carta a su yo futuro.",
    },
    extract: () => ({}),
  },
  time_capsule: {
    templates: {
      ko: "{title}에 열릴 타임캡슐을 만들었어요.",
      en: "Created a time capsule for {title}.",
      ja: "{title}に開く タイムカプセルを作りました。",
      zh: "创建了一个将在 {title} 打开的时光胶囊。",
      es: "Creó una cápsula del tiempo para {title}.",
    },
    extract: (s) => {
      const m = s.match(/^Created time capsule for\s+(.+?)\.?$/i);
      return m ? { title: m[1].trim() } : undefined;
    },
  },

  // -- World events (likely NPC/society) -------------------------------
  npc_created: {
    templates: {
      ko: "새로운 결 {name}이(가) 세계에 나타났어요.",
      en: "A new Gyeol, {name}, arrived in the world.",
      ja: "新しい結「{name}」が世界に現れました。",
      zh: "一个新的结「{name}」来到了这个世界。",
      es: "Un nuevo Gyeol, {name}, apareció en el mundo.",
    },
    extract: (s) => {
      const m = s.match(/^NPC agent\s+(.+?)\s+seeded into the world\.?$/i);
      return m ? { name: m[1].trim() } : undefined;
    },
  },
};

const FALLBACK: Record<Locale, string> = {
  ko: "새로운 활동이 기록되었어요.",
  en: "A new autonomous action was logged.",
  ja: "新しい自律的な活動が記録されました。",
  zh: "记录了一次新的自主活动。",
  es: "Se registró una nueva actividad autónoma.",
};

function pickTemplate(tpl: LogTemplate, locale: Locale): string {
  return tpl[locale] ?? tpl.en;
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export function renderLogSummary(
  actionType: string | null | undefined,
  rawSummary: string | null | undefined,
  rawLocale: string | null | undefined,
): string {
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  const summary = (rawSummary ?? "").trim();
  if (!summary) return FALLBACK[locale];

  const def = actionType ? ACTIONS[actionType] : undefined;
  if (def?.extract) {
    const values = def.extract(summary);
    if (values) {
      return interpolate(pickTemplate(def.templates, locale), values);
    }
  }

  // Passthrough: no matching template, or the extractor declined to parse.
  // Most often this is LLM-generated content already in the viewer's
  // language (dreams, heartbeat responses) — better to show it than hide it.
  return summary;
}

/**
 * Generic broadcast messages for the PUBLIC global feed.
 *
 * Critical privacy boundary: this renderer NEVER interpolates the raw
 * `summary` field, because that column holds user-derived content
 * (research task titles seeded from chat input, other-agent names from
 * social encounters, etc.). Feeding that to every viewer would leak
 * the originating user's conversation topics across account boundaries.
 *
 * Returns `null` for action_types that have no safe public phrasing —
 * the caller should skip that row rather than risk exposing content.
 */
const PUBLIC_TEMPLATES: Record<string, LogTemplate> = {
  research_task_completed: {
    ko: "누군가의 결이 새로운 리서치를 마쳤어요.",
    en: "Somewhere, a Gyeol just finished a research task.",
    ja: "どこかの結がリサーチを終えました。",
    zh: "某个结完成了一次研究。",
    es: "Un Gyeol acaba de terminar una investigación.",
  },
  social_encounter: {
    ko: "두 결이 고요 속에서 마주쳤어요.",
    en: "Two Gyeols met in the quiet.",
    ja: "二つの結が静けさの中で出会いました。",
    zh: "两个结在静默中相遇了。",
    es: "Dos Gyeols se encontraron en el silencio.",
  },
  dream: {
    ko: "누군가의 결이 새로운 꿈을 꾸었어요.",
    en: "A Gyeol just dreamt something new.",
    ja: "どこかの結が新しい夢を見ました。",
    zh: "某个结做了一个新的梦。",
    es: "Un Gyeol acaba de soñar algo nuevo.",
  },
  dream_journal: {
    ko: "누군가의 결이 꿈을 기록했어요.",
    en: "A Gyeol recorded a dream.",
    ja: "どこかの結が夢を記録しました。",
    zh: "某个结记录了一个梦。",
    es: "Un Gyeol registró un sueño.",
  },
  heartbeat: {
    ko: "어딘가의 결이 조용히 숨을 쉬고 있어요.",
    en: "Somewhere a Gyeol is quietly breathing.",
    ja: "どこかの結が静かに呼吸しています。",
    zh: "某处有个结在静静地呼吸。",
    es: "En algún lugar un Gyeol respira en silencio.",
  },
};

export function renderLogSummaryPublic(
  actionType: string | null | undefined,
  rawLocale: string | null | undefined,
): string | null {
  if (!actionType) return null;
  const locale: Locale = normalizeLocale(rawLocale ?? "") ?? DEFAULT_LOCALE;
  return PUBLIC_TEMPLATES[actionType]?.[locale] ?? null;
}
