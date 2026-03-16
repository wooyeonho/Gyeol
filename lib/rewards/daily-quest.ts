export type DailyQuest = {
  id: string;
  title: Record<string, string>;
  target: number;
  reward: number; // coins
  type: "messages" | "visit_album" | "visit_social" | "visit_activity" | "streak_maintain";
};

const QUEST_POOL: Omit<DailyQuest, "id">[] = [
  { title: { ko: "대화 3회 하기", en: "Send 3 messages" }, target: 3, reward: 5, type: "messages" },
  { title: { ko: "대화 7회 하기", en: "Send 7 messages" }, target: 7, reward: 10, type: "messages" },
  { title: { ko: "대화 15회 하기", en: "Send 15 messages" }, target: 15, reward: 20, type: "messages" },
  { title: { ko: "앨범 확인하기", en: "Check your album" }, target: 1, reward: 3, type: "visit_album" },
  { title: { ko: "소셜 탐색하기", en: "Visit social" }, target: 1, reward: 3, type: "visit_social" },
  { title: { ko: "활동 로그 확인", en: "Review activity" }, target: 1, reward: 3, type: "visit_activity" },
  { title: { ko: "스트릭 유지하기", en: "Maintain your streak" }, target: 1, reward: 5, type: "streak_maintain" },
];

const STORAGE_KEY = "gyeol-daily-quests-v1";

type StoredQuestState = {
  date: string;
  quests: Array<DailyQuest & { progress: number; completed: boolean }>;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const x = Math.sin(seed * (i + 1) * 9301 + 49297) * 233280;
    const j = Math.floor((x - Math.floor(x)) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getDailyQuests(): StoredQuestState {
  const today = todayString();

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredQuestState;
        if (parsed.date === today && Array.isArray(parsed.quests)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Generate new quests for today
  const seed = parseInt(today.replace(/-/g, ""), 10);
  const shuffled = seededShuffle(QUEST_POOL, seed);
  const selected = shuffled.slice(0, 3);
  const state: StoredQuestState = {
    date: today,
    quests: selected.map((q, i) => ({
      ...q,
      id: `quest-${today}-${i}`,
      progress: 0,
      completed: false,
    })),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  return state;
}

export function updateQuestProgress(
  questId: string,
  newProgress: number,
): StoredQuestState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as StoredQuestState;
    if (state.date !== todayString()) return null;

    const quest = state.quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return state;

    quest.progress = Math.min(newProgress, quest.target);
    if (quest.progress >= quest.target) {
      quest.completed = true;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    return null;
  }
}
