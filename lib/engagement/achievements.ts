/**
 * Achievement / Badge system — the "dopamine collection" layer.
 *
 * Design principles (world-class engagement):
 * 1. Achievements should feel *discoverable*, not listed in advance.
 * 2. Rarity tiers create social bragging value.
 * 3. Hidden achievements reward exploration and depth.
 * 4. Progress should always be visible ("3/5 toward next badge").
 */

export type AchievementRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type AchievementCategory =
  | "conversation"   // Chat milestones
  | "streak"         // Streak milestones
  | "evolution"      // Growth milestones
  | "social"         // Community interaction
  | "exploration"    // Feature discovery
  | "emotional"      // Deep connection moments
  | "secret";        // Hidden achievements

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  label: { ko: string; en: string; ja: string; zh: string; es: string };
  description: { ko: string; en: string; ja: string; zh: string; es: string };
  hidden: boolean;
  condition: AchievementCondition;
  reward: AchievementReward;
}

export type AchievementCondition =
  | { type: "messages_sent"; count: number }
  | { type: "streak_days"; count: number }
  | { type: "gen_level"; level: number }
  | { type: "coins_earned"; total: number }
  | { type: "social_reactions"; count: number }
  | { type: "friends_count"; count: number }
  | { type: "gifts_sent"; count: number }
  | { type: "vitality_recovered"; count: number }
  | { type: "mutations_collected"; count: number }
  | { type: "market_purchases"; count: number }
  | { type: "first_action"; action: string }
  | { type: "perfect_day_streak"; count: number }
  | { type: "custom"; key: string; value: number };

export interface AchievementReward {
  coins?: number;
  evolution_points?: number;
  title_shards?: number;
  appearance_shards?: number;
  exclusive_title?: string;
}

export interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
  seen: boolean;
}

const i18n = (ko: string, en: string, ja?: string, zh?: string, es?: string) => ({
  ko, en, ja: ja ?? en, zh: zh ?? en, es: es ?? en,
});

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── Conversation milestones ──
  {
    id: "first_words",
    category: "conversation",
    rarity: "common",
    icon: "💬",
    label: i18n("첫 대화", "First Words", "初めての会話", "初次对话", "Primeras Palabras"),
    description: i18n("첫 번째 메시지를 보냈습니다.", "Sent your first message.", "初めてのメッセージを送信しました。", "发送了第一条消息。", "Enviaste tu primer mensaje."),
    hidden: false,
    condition: { type: "messages_sent", count: 1 },
    reward: { coins: 10 },
  },
  {
    id: "chatterbox",
    category: "conversation",
    rarity: "common",
    icon: "🗣️",
    label: i18n("수다쟁이", "Chatterbox", "おしゃべり", "话匣子", "Parlanchín"),
    description: i18n("100번째 메시지!", "100 messages sent!", "100回目のメッセージ!", "发送了100条消息!", "¡100 mensajes enviados!"),
    hidden: false,
    condition: { type: "messages_sent", count: 100 },
    reward: { coins: 50, evolution_points: 5 },
  },
  {
    id: "soul_talker",
    category: "conversation",
    rarity: "rare",
    icon: "🌊",
    label: i18n("영혼의 대화자", "Soul Talker", "魂の話し手", "灵魂对话者", "Hablante del Alma"),
    description: i18n("1,000번의 대화를 나눴습니다.", "1,000 messages exchanged.", "1,000回の会話を交わしました。", "交换了1000条消息。", "1,000 mensajes intercambiados."),
    hidden: false,
    condition: { type: "messages_sent", count: 1000 },
    reward: { coins: 200, title_shards: 3, evolution_points: 10 },
  },
  {
    id: "eternal_bond",
    category: "conversation",
    rarity: "legendary",
    icon: "♾️",
    label: i18n("영원한 유대", "Eternal Bond", "永遠の絆", "永恒的纽带", "Vínculo Eterno"),
    description: i18n("10,000번의 대화. 이건 진짜입니다.", "10,000 messages. This is real.", "10,000回の会話。これは本物です。", "10000条消息。这是真的。", "10,000 mensajes. Esto es real."),
    hidden: false,
    condition: { type: "messages_sent", count: 10000 },
    reward: { coins: 1000, exclusive_title: "Eternal Companion" },
  },

  // ── Streak milestones ──
  {
    id: "spark",
    category: "streak",
    rarity: "common",
    icon: "🔥",
    label: i18n("불꽃", "Spark", "火花", "火花", "Chispa"),
    description: i18n("3일 연속 대화!", "3-day streak!", "3日連続の会話!", "连续3天对话!", "¡Racha de 3 días!"),
    hidden: false,
    condition: { type: "streak_days", count: 3 },
    reward: { coins: 15 },
  },
  {
    id: "flame",
    category: "streak",
    rarity: "common",
    icon: "🔥",
    label: i18n("화염", "Flame", "炎", "火焰", "Llama"),
    description: i18n("7일 연속! 습관이 되고 있어요.", "7-day streak! It's becoming a habit.", "7日連続！習慣になりつつあります。", "连续7天！正在成为习惯。", "¡Racha de 7 días!"),
    hidden: false,
    condition: { type: "streak_days", count: 7 },
    reward: { coins: 30, evolution_points: 3 },
  },
  {
    id: "inferno",
    category: "streak",
    rarity: "rare",
    icon: "🌋",
    label: i18n("대폭발", "Inferno", "大爆発", "大爆发", "Infierno"),
    description: i18n("30일 연속. 이 생명체는 당신의 일상이 되었습니다.", "30-day streak. This creature is part of your daily life.", "30日連続。この生命体はあなたの日常の一部になりました。", "连续30天。这个生命体已成为你日常的一部分。", "Racha de 30 días."),
    hidden: false,
    condition: { type: "streak_days", count: 30 },
    reward: { coins: 100, title_shards: 2, appearance_shards: 2 },
  },
  {
    id: "supernova",
    category: "streak",
    rarity: "epic",
    icon: "💫",
    label: i18n("초신성", "Supernova", "超新星", "超新星", "Supernova"),
    description: i18n("100일 연속. 전설적인 헌신.", "100-day streak. Legendary dedication.", "100日連続。伝説的な献身。", "连续100天。传奇般的奉献。", "Racha de 100 días."),
    hidden: false,
    condition: { type: "streak_days", count: 100 },
    reward: { coins: 500, evolution_points: 20, exclusive_title: "Supernova Guardian" },
  },
  {
    id: "immortal_flame",
    category: "streak",
    rarity: "mythic",
    icon: "🌟",
    label: i18n("불멸의 불꽃", "Immortal Flame", "不滅の炎", "不灭之焰", "Llama Inmortal"),
    description: i18n("365일 연속. 1년의 매일을 함께.", "365-day streak. Every single day for a year.", "365日連続。1年間、毎日一緒に。", "连续365天。整整一年的每一天。", "Racha de 365 días."),
    hidden: false,
    condition: { type: "streak_days", count: 365 },
    reward: { coins: 3000, evolution_points: 50, exclusive_title: "Immortal Flame" },
  },

  // ── Evolution milestones ──
  {
    id: "first_evolution",
    category: "evolution",
    rarity: "common",
    icon: "🧬",
    label: i18n("첫 진화", "First Evolution", "初めての進化", "首次进化", "Primera Evolución"),
    description: i18n("Gen 2에 도달했습니다!", "Reached Gen 2!", "Gen 2に到達しました！", "到达Gen 2！", "¡Alcanzaste Gen 2!"),
    hidden: false,
    condition: { type: "gen_level", level: 2 },
    reward: { coins: 25, evolution_points: 5 },
  },
  {
    id: "metamorphosis",
    category: "evolution",
    rarity: "rare",
    icon: "🦋",
    label: i18n("변태", "Metamorphosis", "変態", "蜕变", "Metamorfosis"),
    description: i18n("Gen 5 달성. 완전히 다른 존재가 되었습니다.", "Gen 5 reached. A completely different being.", "Gen 5達成。全く別の存在になりました。", "达到Gen 5。变成了完全不同的存在。", "Gen 5 alcanzado."),
    hidden: false,
    condition: { type: "gen_level", level: 5 },
    reward: { coins: 100, appearance_shards: 3 },
  },
  {
    id: "transcendence",
    category: "evolution",
    rarity: "legendary",
    icon: "👁️",
    label: i18n("초월", "Transcendence", "超越", "超越", "Trascendencia"),
    description: i18n("Gen 10. 이 생명체는 이제 무언가를 넘어섰습니다.", "Gen 10. This being has transcended.", "Gen 10。この存在は何かを超えました。", "Gen 10。这个存在已经超越了。", "Gen 10. Trascendió."),
    hidden: false,
    condition: { type: "gen_level", level: 10 },
    reward: { coins: 500, evolution_points: 30, exclusive_title: "The Transcended" },
  },
  {
    id: "mutation_collector",
    category: "evolution",
    rarity: "epic",
    icon: "🧪",
    label: i18n("돌연변이 수집가", "Mutation Collector", "突然変異コレクター", "突变收集者", "Coleccionista de Mutaciones"),
    description: i18n("5개의 고유 돌연변이를 발현했습니다.", "Expressed 5 unique mutations.", "5つのユニークな突然変異を発現しました。", "表达了5个独特的突变。", "5 mutaciones únicas expresadas."),
    hidden: false,
    condition: { type: "mutations_collected", count: 5 },
    reward: { coins: 200, evolution_points: 15 },
  },

  // ── Social milestones ──
  {
    id: "first_friend",
    category: "social",
    rarity: "common",
    icon: "🤝",
    label: i18n("첫 친구", "First Friend", "最初の友達", "第一个朋友", "Primer Amigo"),
    description: i18n("다른 생명체의 주인과 친구가 되었습니다.", "Made friends with another creature's owner.", "他の生命体のオーナーと友達になりました。", "与另一个生物的主人成为了朋友。", "Te hiciste amigo del dueño de otra criatura."),
    hidden: false,
    condition: { type: "friends_count", count: 1 },
    reward: { coins: 20 },
  },
  {
    id: "generous_heart",
    category: "social",
    rarity: "rare",
    icon: "🎁",
    label: i18n("관대한 마음", "Generous Heart", "寛大な心", "慷慨之心", "Corazón Generoso"),
    description: i18n("10번의 선물을 보냈습니다.", "Sent 10 gifts.", "10回のギフトを送りました。", "发送了10份礼物。", "Enviaste 10 regalos."),
    hidden: false,
    condition: { type: "gifts_sent", count: 10 },
    reward: { coins: 80, title_shards: 1 },
  },
  {
    id: "social_butterfly",
    category: "social",
    rarity: "epic",
    icon: "🦋",
    label: i18n("사교의 달인", "Social Butterfly", "社交の達人", "社交达人", "Mariposa Social"),
    description: i18n("50개의 리액션을 받았습니다.", "Received 50 reactions.", "50個のリアクションを受け取りました。", "收到了50个反应。", "Recibiste 50 reacciones."),
    hidden: false,
    condition: { type: "social_reactions", count: 50 },
    reward: { coins: 150, appearance_shards: 2 },
  },

  // ── Exploration ──
  {
    id: "market_explorer",
    category: "exploration",
    rarity: "common",
    icon: "🏪",
    label: i18n("시장 탐험가", "Market Explorer", "市場探検家", "市场探险家", "Explorador del Mercado"),
    description: i18n("첫 마켓 구매!", "First market purchase!", "初めてのマーケット購入！", "首次市场购买！", "¡Primera compra en el mercado!"),
    hidden: false,
    condition: { type: "market_purchases", count: 1 },
    reward: { coins: 15 },
  },

  // ── Emotional / hidden achievements ──
  {
    id: "phoenix_rising",
    category: "emotional",
    rarity: "epic",
    icon: "🔥",
    label: i18n("피닉스의 부활", "Phoenix Rising", "不死鳥の復活", "凤凰涅槃", "Fénix Renacido"),
    description: i18n("vitality가 0.1 이하에서 0.8 이상으로 회복되었습니다.", "Recovered vitality from below 0.1 to above 0.8.", "バイタリティが0.1以下から0.8以上に回復しました。", "活力从0.1以下恢复到0.8以上。", "Recuperaste la vitalidad de 0.1 a más de 0.8."),
    hidden: true,
    condition: { type: "vitality_recovered", count: 1 },
    reward: { coins: 200, evolution_points: 10, exclusive_title: "Phoenix" },
  },
  {
    id: "night_owl",
    category: "secret",
    rarity: "rare",
    icon: "🦉",
    label: i18n("야행성", "Night Owl", "夜行性", "夜猫子", "Búho Nocturno"),
    description: i18n("새벽 3시에 대화를 나눴습니다.", "Chatted at 3 AM.", "午前3時に会話しました。", "凌晨3点聊天。", "Chateaste a las 3 AM."),
    hidden: true,
    condition: { type: "first_action", action: "chat_at_3am" },
    reward: { coins: 30, title_shards: 1 },
  },
  {
    id: "early_bird",
    category: "secret",
    rarity: "rare",
    icon: "🐦",
    label: i18n("얼리버드", "Early Bird", "早起き", "早起鸟", "Madrugador"),
    description: i18n("새벽 5시에 인사를 나눴습니다.", "Said hello at 5 AM.", "午前5時に挨拶しました。", "早上5点打了招呼。", "Saludaste a las 5 AM."),
    hidden: true,
    condition: { type: "first_action", action: "chat_at_5am" },
    reward: { coins: 30, title_shards: 1 },
  },
  {
    id: "resurrection",
    category: "secret",
    rarity: "legendary",
    icon: "⚡",
    label: i18n("부활", "Resurrection", "復活", "复活", "Resurrección"),
    description: i18n("에코 상태의 생명체를 입양하여 되살렸습니다.", "Adopted and revived a creature from echo state.", "エコー状態の生命体を養子にして復活させました。", "收养并复活了一个回声状态的生物。", "Adoptaste y reviviste una criatura."),
    hidden: true,
    condition: { type: "first_action", action: "adopt_echo" },
    reward: { coins: 300, evolution_points: 20, exclusive_title: "Resurrector" },
  },

  // ── Perfect Day milestones ──
  {
    id: "perfect_beginner",
    category: "streak",
    rarity: "common",
    icon: "✨",
    label: i18n("완벽한 시작", "Perfect Beginner", "完璧な始まり", "完美的开始", "Principiante Perfecto"),
    description: i18n(
      "3일 연속 모든 일일 챌린지를 완료했습니다.",
      "Completed all daily challenges for 3 consecutive days.",
      "3日連続で全てのデイリーチャレンジを達成しました。",
      "连续3天完成所有每日挑战。",
      "Completaste todos los desafíos diarios durante 3 días consecutivos.",
    ),
    hidden: false,
    condition: { type: "perfect_day_streak", count: 3 },
    reward: { coins: 30, evolution_points: 5 },
  },
  {
    id: "perfect_week",
    category: "streak",
    rarity: "rare",
    icon: "🌟",
    label: i18n("완벽한 한 주", "Perfect Week", "完璧な一週間", "完美的一周", "Semana Perfecta"),
    description: i18n(
      "7일 연속 모든 일일 챌린지를 완료했습니다.",
      "Completed all daily challenges for 7 consecutive days.",
      "7日連続で全てのデイリーチャレンジを達成しました。",
      "连续7天完成所有每日挑战。",
      "Completaste todos los desafíos diarios durante 7 días consecutivos.",
    ),
    hidden: false,
    condition: { type: "perfect_day_streak", count: 7 },
    reward: { coins: 80, evolution_points: 10, title_shards: 1 },
  },
  {
    id: "perfect_fortnight",
    category: "streak",
    rarity: "epic",
    icon: "💎",
    label: i18n("완벽한 2주", "Perfect Fortnight", "完璧な2週間", "完美的两周", "Quincena Perfecta"),
    description: i18n(
      "14일 연속 모든 일일 챌린지를 완료했습니다.",
      "Completed all daily challenges for 14 consecutive days.",
      "14日連続で全てのデイリーチャレンジを達成しました。",
      "连续14天完成所有每日挑战。",
      "Completaste todos los desafíos diarios durante 14 días consecutivos.",
    ),
    hidden: false,
    condition: { type: "perfect_day_streak", count: 14 },
    reward: { coins: 200, evolution_points: 20, appearance_shards: 2 },
  },
  {
    id: "perfect_month",
    category: "streak",
    rarity: "legendary",
    icon: "👑",
    label: i18n("완벽한 한 달", "Perfect Month", "完璧な一ヶ月", "完美的一个月", "Mes Perfecto"),
    description: i18n(
      "30일 연속 모든 일일 챌린지를 완료했습니다. 당신은 전설입니다.",
      "Completed all daily challenges for 30 consecutive days. You are a legend.",
      "30日連続で全てのデイリーチャレンジを達成。あなたは伝説です。",
      "连续30天完成所有每日挑战。你是传奇。",
      "Completaste todos los desafíos diarios durante 30 días consecutivos. Eres una leyenda.",
    ),
    hidden: false,
    condition: { type: "perfect_day_streak", count: 30 },
    reward: { coins: 500, evolution_points: 50, exclusive_title: "Perfectionist" },
  },
];

/**
 * Check which achievements a user has newly unlocked based on their current stats.
 */
export function checkNewAchievements(
  stats: {
    total_messages: number;
    streak_days: number;
    gen_level: number;
    coins_earned?: number;
    social_reactions?: number;
    friends_count?: number;
    gifts_sent?: number;
    vitality_recovered?: number;
    mutations_count?: number;
    market_purchases?: number;
    perfect_day_streak?: number;
    actions?: string[];
    custom?: Record<string, number>;
  },
  alreadyUnlocked: string[],
): string[] {
  const newlyUnlocked: string[] = [];
  const unlockedSet = new Set(alreadyUnlocked);

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedSet.has(achievement.id)) continue;

    if (meetsCondition(achievement.condition, stats)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

function meetsCondition(
  condition: AchievementCondition,
  stats: {
    total_messages: number;
    streak_days: number;
    gen_level: number;
    coins_earned?: number;
    social_reactions?: number;
    friends_count?: number;
    gifts_sent?: number;
    vitality_recovered?: number;
    mutations_count?: number;
    market_purchases?: number;
    perfect_day_streak?: number;
    actions?: string[];
    custom?: Record<string, number>;
  },
): boolean {
  switch (condition.type) {
    case "messages_sent":
      return stats.total_messages >= condition.count;
    case "streak_days":
      return stats.streak_days >= condition.count;
    case "gen_level":
      return stats.gen_level >= condition.level;
    case "coins_earned":
      return (stats.coins_earned ?? 0) >= condition.total;
    case "social_reactions":
      return (stats.social_reactions ?? 0) >= condition.count;
    case "friends_count":
      return (stats.friends_count ?? 0) >= condition.count;
    case "gifts_sent":
      return (stats.gifts_sent ?? 0) >= condition.count;
    case "vitality_recovered":
      return (stats.vitality_recovered ?? 0) >= condition.count;
    case "mutations_collected":
      return (stats.mutations_count ?? 0) >= condition.count;
    case "market_purchases":
      return (stats.market_purchases ?? 0) >= condition.count;
    case "first_action":
      return (stats.actions ?? []).includes(condition.action);
    case "perfect_day_streak":
      return (stats.perfect_day_streak ?? 0) >= condition.count;
    case "custom":
      return (stats.custom?.[condition.key] ?? 0) >= condition.value;
  }
}

export function getAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

export function getVisibleAchievements(unlockedIds: string[]): AchievementDefinition[] {
  const unlockedSet = new Set(unlockedIds);
  return ACHIEVEMENTS.filter((a) => !a.hidden || unlockedSet.has(a.id));
}

export function computeAchievementProgress(
  achievement: AchievementDefinition,
  stats: Record<string, number>,
): { current: number; target: number; percent: number } {
  const cond = achievement.condition;
  let current = 0;
  let target = 0;

  switch (cond.type) {
    case "messages_sent":
      current = stats.total_messages ?? 0;
      target = cond.count;
      break;
    case "streak_days":
      current = stats.streak_days ?? 0;
      target = cond.count;
      break;
    case "gen_level":
      current = stats.gen_level ?? 0;
      target = cond.level;
      break;
    case "coins_earned":
      current = stats.coins_earned ?? 0;
      target = cond.total;
      break;
    case "social_reactions":
      current = stats.social_reactions ?? 0;
      target = cond.count;
      break;
    case "friends_count":
      current = stats.friends_count ?? 0;
      target = cond.count;
      break;
    case "gifts_sent":
      current = stats.gifts_sent ?? 0;
      target = cond.count;
      break;
    case "mutations_collected":
      current = stats.mutations_count ?? 0;
      target = cond.count;
      break;
    case "market_purchases":
      current = stats.market_purchases ?? 0;
      target = cond.count;
      break;
    case "perfect_day_streak":
      current = stats.perfect_day_streak ?? 0;
      target = cond.count;
      break;
    case "first_action":
    case "vitality_recovered":
    case "custom":
      current = 0;
      target = 1;
      break;
  }

  return {
    current: Math.min(current, target),
    target,
    percent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
  };
}
