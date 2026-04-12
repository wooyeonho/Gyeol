/**
 * Mini-Programs Framework — WeChat/KakaoTalk-inspired in-chat micro apps.
 *
 * Mini-programs are lightweight interactive widgets that can be triggered
 * via slash commands within the chat interface.
 */

export type MiniProgramType = "poll" | "quiz" | "timer" | "dice" | "weather" | "mood_check";

export interface MiniProgram {
  type: MiniProgramType;
  id: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  slashCommand: string;
  icon: string;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  multiSelect: boolean;
  expiresAt: string | null;
}

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: { ko: string; en: string };
}

export interface TimerData {
  durationSeconds: number;
  label: string;
  startedAt: string;
}

export interface DiceData {
  sides: number;
  count: number;
  results: number[];
}

/** Registry of available mini-programs */
export const MINI_PROGRAM_REGISTRY: {
  type: MiniProgramType;
  slashCommand: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
}[] = [
  {
    type: "poll",
    slashCommand: "/poll",
    title: { ko: "투표", en: "Poll" },
    description: { ko: "투표를 만들어요", en: "Create a poll" },
    icon: "📊",
  },
  {
    type: "quiz",
    slashCommand: "/quiz",
    title: { ko: "퀴즈", en: "Quiz" },
    description: { ko: "퀴즈를 출제해요", en: "Start a quiz" },
    icon: "❓",
  },
  {
    type: "timer",
    slashCommand: "/timer",
    title: { ko: "타이머", en: "Timer" },
    description: { ko: "타이머를 시작해요", en: "Start a timer" },
    icon: "⏱️",
  },
  {
    type: "dice",
    slashCommand: "/dice",
    title: { ko: "주사위", en: "Dice" },
    description: { ko: "주사위를 굴려요", en: "Roll dice" },
    icon: "🎲",
  },
  {
    type: "weather",
    slashCommand: "/weather",
    title: { ko: "날씨", en: "Weather" },
    description: { ko: "날씨를 확인해요", en: "Check weather" },
    icon: "🌤️",
  },
  {
    type: "mood_check",
    slashCommand: "/mood",
    title: { ko: "기분 체크", en: "Mood Check" },
    description: { ko: "오늘 기분을 기록해요", en: "Log your mood" },
    icon: "😊",
  },
];

/**
 * Parse a slash command input to identify which mini-program to launch.
 */
export function parseMiniProgramCommand(input: string): { type: MiniProgramType; args: string } | null {
  const trimmed = input.trim();
  for (const mp of MINI_PROGRAM_REGISTRY) {
    if (trimmed.startsWith(mp.slashCommand)) {
      const args = trimmed.slice(mp.slashCommand.length).trim();
      return { type: mp.type, args };
    }
  }
  return null;
}

/**
 * Create a poll mini-program from slash command args.
 * Format: /poll Question? | Option A | Option B | Option C
 */
export function createPoll(creatorId: string, args: string): MiniProgram {
  const parts = args.split("|").map((s) => s.trim()).filter(Boolean);
  const question = parts[0] ?? "Vote!";
  const options: PollOption[] = parts.slice(1).map((text, i) => ({
    id: `opt_${i}`,
    text,
    votes: 0,
  }));

  if (options.length < 2) {
    options.push({ id: "opt_0", text: "Yes", votes: 0 });
    options.push({ id: "opt_1", text: "No", votes: 0 });
  }

  const data: PollData = { question, options, multiSelect: false, expiresAt: null };

  return {
    type: "poll",
    id: `poll_${Date.now()}`,
    title: { ko: "투표", en: "Poll" },
    description: { ko: question, en: question },
    slashCommand: "/poll",
    icon: "📊",
    data: data as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString(),
    createdBy: creatorId,
  };
}

/**
 * Roll dice based on slash command args.
 * Format: /dice 2d6 (2 dice, 6 sides)
 */
export function rollDice(args: string): DiceData {
  const match = args.match(/(\d+)d(\d+)/);
  const count = match ? Math.min(parseInt(match[1], 10), 10) : 1;
  const sides = match ? Math.min(parseInt(match[2], 10), 100) : 6;

  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  return { sides, count, results };
}
