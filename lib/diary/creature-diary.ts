/**
 * Creature Emotion Diary — daily autonomous diary entries.
 *
 * The creature writes a one-line diary entry each day during heartbeat.
 * Entries are stored in autonomous_logs with action_type "diary".
 * Users can view them in a calendar layout.
 */

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: string;
  moodEmoji: string;
  summary: string;
  createdAt: string;
}

/**
 * Map mood string to an emoji for diary display.
 */
export function getMoodEmoji(mood: string): string {
  const map: Record<string, string> = {
    joyful: "😊", playful: "😜", excited: "🤩", proud: "😤",
    inspired: "✨", loving: "🥰", grateful: "🙏", mischievous: "😏",
    curious: "🤔", thoughtful: "💭", dreamy: "💫", focused: "🎯",
    peaceful: "😌", tender: "🤗", melancholy: "😢", sad: "😔",
    lonely: "🥺", angry: "😠", frustrated: "😤", scared: "😰",
    shy: "😳", jealous: "😒", surprised: "😮", confused: "😵",
    bored: "😴", energetic: "⚡", sleepy: "😪", neutral: "🫥",
  };
  return map[mood] || "📝";
}

/**
 * Generate a diary prompt for the heartbeat cron.
 * The creature should write about its day in one line.
 */
export function buildDiaryPrompt(
  locale: string,
  mood: string,
  recentEvents: string[],
  hoursSinceUser: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko-");
  const eventsContext = recentEvents.length > 0
    ? `\nToday's events: ${recentEvents.slice(0, 3).join("; ")}`
    : "";

  if (isKo) {
    return `오늘 하루 일기를 한 줄로 써줘. 지금 기분: ${mood}. 주인이 마지막으로 온 지 ${Math.round(hoursSinceUser)}시간 됐어.${eventsContext}\n\n조건:\n- 딱 1문장\n- 감정이 담긴 구체적인 내용\n- "오늘은..." 으로 시작하지 마`;
  }
  return `Write a one-line diary entry for today. Current mood: ${mood}. Owner last visited ${Math.round(hoursSinceUser)} hours ago.${eventsContext}\n\nRules:\n- Exactly 1 sentence\n- Specific and emotional\n- Don't start with "Today..."`;
}

/**
 * Check if a diary entry was already written today for the given agent.
 */
export function isDiaryWrittenToday(lastDiaryDate: string | null): boolean {
  if (!lastDiaryDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return lastDiaryDate === today;
}

/**
 * Format a date string for diary display.
 */
export function formatDiaryDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const isKo = locale === "ko" || locale.startsWith("ko-");
  if (isKo) {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
