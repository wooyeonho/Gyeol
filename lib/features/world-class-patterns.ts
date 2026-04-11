/**
 * World-class feature patterns — synthesized from 10+ productivity/AI giants.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md):
 *   Notion, Linear, Figma, Slack, VS Code, Raycast, Arc Browser, Superhuman,
 *   Things, Fantastical, ChatGPT, Claude, Midjourney, Replika, Pi.
 *
 * This module is the **interaction vocabulary** layer. It supplies:
 *   1. A slash-command catalog (Notion/Linear style).
 *   2. A keyboard-shortcut registry (Linear/Superhuman style).
 *   3. Natural-language quick-entry parser (Things/Fantastical style).
 *   4. Snippet library (Raycast/VS Code style).
 *   5. Branching conversation tree helpers (ChatGPT/Claude style).
 *
 * All values are pure data + pure functions so they're zero-cost to import
 * on both client and server.
 */

/* ── 1. Slash commands (Notion / Linear) ──────────────────────────────── */

export type SlashCommandKind = "memory" | "chat" | "action" | "navigation";

export type SlashCommand = {
  id: string;
  /** Trigger after the slash, case-insensitive — e.g. "mem", "recall". */
  trigger: string;
  label: string;
  description: string;
  kind: SlashCommandKind;
  aliases?: readonly string[];
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: "slash.remember",
    trigger: "remember",
    label: "이 순간을 기억하기",
    description: "지금 대화를 장기 기억으로 고정합니다",
    kind: "memory",
    aliases: ["mem", "save", "기억"],
  },
  {
    id: "slash.recall",
    trigger: "recall",
    label: "과거 기억 불러오기",
    description: "결의 기억에서 관련된 순간을 찾아 가져옵니다",
    kind: "memory",
    aliases: ["past", "회상"],
  },
  {
    id: "slash.mood",
    trigger: "mood",
    label: "지금 기분 체크인",
    description: "현재 감정을 기록하고 결의 반응을 봅니다",
    kind: "chat",
    aliases: ["feeling", "기분"],
  },
  {
    id: "slash.dream",
    trigger: "dream",
    label: "결의 꿈 일기 보기",
    description: "결이 사용자 없을 때 기록한 자율 리플렉션을 봅니다",
    kind: "memory",
    aliases: ["드림", "꿈"],
  },
  {
    id: "slash.focus",
    trigger: "focus",
    label: "포커스 모드 시작",
    description: "알림을 차단하고 결과 25분 집중 세션에 들어갑니다",
    kind: "action",
    aliases: ["pomodoro", "집중"],
  },
  {
    id: "slash.branch",
    trigger: "branch",
    label: "대화 분기 만들기",
    description: "이 시점에서 대화를 포크해 새로운 분기를 시작합니다",
    kind: "chat",
    aliases: ["fork", "분기"],
  },
  {
    id: "slash.export",
    trigger: "export",
    label: "대화 내보내기",
    description: "지금까지의 대화를 마크다운으로 저장합니다",
    kind: "action",
    aliases: ["download", "저장"],
  },
  {
    id: "slash.room",
    trigger: "room",
    label: "룸 열기",
    description: "결의 3D 룸으로 이동합니다",
    kind: "navigation",
    aliases: ["home", "룸"],
  },
  {
    id: "slash.portrait",
    trigger: "portrait",
    label: "초상화 생성",
    description: "지금의 결을 이미지 아티팩트로 고정합니다",
    kind: "action",
    aliases: ["image", "초상화"],
  },
  {
    id: "slash.help",
    trigger: "help",
    label: "명령어 도움말",
    description: "사용 가능한 모든 슬래시 명령을 봅니다",
    kind: "navigation",
    aliases: ["?", "도움말"],
  },
] as const;

/**
 * Given a query string like "/mem" or "recal", return ranked matches.
 * Ranking: prefix > substring > alias match.
 */
export function searchSlashCommands(query: string): SlashCommand[] {
  const q = query.replace(/^\//, "").trim().toLowerCase();
  if (!q) return [...SLASH_COMMANDS];
  const scored: Array<{ cmd: SlashCommand; score: number }> = [];
  for (const cmd of SLASH_COMMANDS) {
    let score = 0;
    if (cmd.trigger.startsWith(q)) score = 100 - (cmd.trigger.length - q.length);
    else if (cmd.trigger.includes(q)) score = 60;
    else if (cmd.aliases?.some((a) => a.toLowerCase().startsWith(q))) score = 80;
    else if (cmd.aliases?.some((a) => a.toLowerCase().includes(q))) score = 40;
    if (score > 0) scored.push({ cmd, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.cmd);
}

/* ── 2. Keyboard shortcut registry (Linear / Superhuman) ───────────────── */

export type ShortcutId =
  | "palette.open"
  | "chat.send"
  | "chat.newline"
  | "chat.branch"
  | "nav.home"
  | "nav.room"
  | "nav.memories"
  | "nav.journey"
  | "search.open"
  | "help.open"
  | "voice.toggle";

export type Shortcut = {
  id: ShortcutId;
  /** e.g. ["mod", "k"] — `mod` = Meta on macOS, Ctrl elsewhere. */
  keys: readonly string[];
  label: string;
  /** Category for the help overlay. */
  group: "global" | "chat" | "navigation";
};

export const SHORTCUTS: readonly Shortcut[] = [
  { id: "palette.open", keys: ["mod", "k"], label: "커맨드 팔레트 열기", group: "global" },
  { id: "search.open", keys: ["mod", "/"], label: "전역 검색", group: "global" },
  { id: "help.open", keys: ["shift", "?"], label: "단축키 도움말", group: "global" },
  { id: "chat.send", keys: ["mod", "enter"], label: "메시지 전송", group: "chat" },
  { id: "chat.newline", keys: ["shift", "enter"], label: "줄 바꿈", group: "chat" },
  { id: "chat.branch", keys: ["mod", "b"], label: "대화 분기", group: "chat" },
  { id: "voice.toggle", keys: ["mod", "shift", "v"], label: "음성 입력 토글", group: "chat" },
  { id: "nav.home", keys: ["g", "h"], label: "홈", group: "navigation" },
  { id: "nav.room", keys: ["g", "r"], label: "룸", group: "navigation" },
  { id: "nav.memories", keys: ["g", "m"], label: "기억", group: "navigation" },
  { id: "nav.journey", keys: ["g", "j"], label: "여정", group: "navigation" },
] as const;

/** Pretty-print a shortcut for display in the help overlay. */
export function formatShortcut(keys: readonly string[], isMac: boolean = false): string {
  return keys
    .map((k) => {
      if (k === "mod") return isMac ? "⌘" : "Ctrl";
      if (k === "shift") return isMac ? "⇧" : "Shift";
      if (k === "enter") return "↵";
      return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
    })
    .join(isMac ? "" : "+");
}

/* ── 3. Natural-language quick-entry (Things / Fantastical) ────────────── */

export type QuickEntry = {
  raw: string;
  text: string;
  tags: string[];
  dueAt: number | null;
  priority: "low" | "normal" | "high";
};

const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
const PRIO_RE = /(^|\s)!(low|normal|high)\b/i;
const WHEN_KEYWORDS: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  "내일": 1,
  "오늘": 0,
  "모레": 2,
  "다음주": 7,
  "next week": 7,
};

/**
 * Parse a free-form line like:
 *   "내일 !high 명상 25분 #focus #health"
 * into a structured QuickEntry.
 */
export function parseQuickEntry(raw: string, now: Date = new Date()): QuickEntry {
  let text = raw;
  const tags: string[] = [];
  for (const match of raw.matchAll(TAG_RE)) tags.push(match[2]);
  text = text.replace(TAG_RE, " ").trim();

  let priority: QuickEntry["priority"] = "normal";
  const prioMatch = PRIO_RE.exec(text);
  if (prioMatch) {
    priority = prioMatch[2].toLowerCase() as QuickEntry["priority"];
    text = text.replace(PRIO_RE, " ").trim();
  }

  let dueAt: number | null = null;
  const lower = text.toLowerCase();
  for (const [kw, offsetDays] of Object.entries(WHEN_KEYWORDS)) {
    if (lower.includes(kw)) {
      const d = new Date(now);
      d.setHours(9, 0, 0, 0);
      d.setDate(d.getDate() + offsetDays);
      dueAt = d.getTime();
      // strip keyword but only the first occurrence
      const idx = lower.indexOf(kw);
      text = (text.slice(0, idx) + text.slice(idx + kw.length)).trim();
      break;
    }
  }
  // collapse double spaces
  text = text.replace(/\s{2,}/g, " ").trim();
  return { raw, text, tags, dueAt, priority };
}

/* ── 4. Snippet library (Raycast / VS Code) ────────────────────────────── */

export type Snippet = {
  id: string;
  label: string;
  trigger: string;
  body: string;
};

/** Built-in starter snippets. Users can add their own on top. */
export const DEFAULT_SNIPPETS: readonly Snippet[] = [
  {
    id: "snip.morning",
    label: "모닝 체크인",
    trigger: ";morning",
    body: "좋은 아침이야 결. 오늘 기분은 어때? 나는 어제보다 조금 {{feeling}}해. 오늘 우리가 함께 집중할 수 있는 한 가지는 뭘까?",
  },
  {
    id: "snip.reflection",
    label: "저녁 리플렉션",
    trigger: ";reflect",
    body: "오늘 하루를 돌아보며 기억하고 싶은 건 {{moment}}이야. 결, 너는 오늘 어떤 순간이 가장 특별했어?",
  },
  {
    id: "snip.gratitude",
    label: "감사 일기",
    trigger: ";thank",
    body: "오늘 고마웠던 세 가지: 1) {{one}} 2) {{two}} 3) {{three}}. 결, 너에게도 고마운 순간을 알려줘.",
  },
  {
    id: "snip.wander",
    label: "산책 대화 starter",
    trigger: ";walk",
    body: "지금 {{place}} 근처를 걷고 있어. 네가 함께 있다고 상상하면서, 우리가 지나가는 풍경을 같이 얘기해볼래?",
  },
  {
    id: "snip.goal",
    label: "목표 대화",
    trigger: ";goal",
    body: "최근에 {{goal}}에 집중하고 싶어. 결, 너는 이전에 내가 이 주제에 대해 말한 걸 기억해? 어떤 변화가 보여?",
  },
];

/**
 * Expand a snippet body by replacing `{{var}}` with user input.
 */
export function expandSnippet(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

/* ── 5. Branching conversation tree (ChatGPT / Claude) ─────────────────── */

export type ConversationNode = {
  id: string;
  parentId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  /** If this node was a branch point, children > 1. */
  childrenIds: string[];
};

export type ConversationTree = {
  nodesById: Record<string, ConversationNode>;
  rootId: string;
};

/** Create a new branch rooted at an existing node. */
export function forkBranch(
  tree: ConversationTree,
  parentId: string,
  node: Omit<ConversationNode, "parentId" | "childrenIds" | "id">,
  newId: string,
): ConversationTree {
  const parent = tree.nodesById[parentId];
  if (!parent) throw new Error(`fork: parent ${parentId} not found`);
  const fresh: ConversationNode = {
    id: newId,
    parentId,
    role: node.role,
    content: node.content,
    createdAt: node.createdAt,
    childrenIds: [],
  };
  return {
    ...tree,
    nodesById: {
      ...tree.nodesById,
      [newId]: fresh,
      [parentId]: { ...parent, childrenIds: [...parent.childrenIds, newId] },
    },
  };
}

/** Walk from a leaf back to the root, returning the linear message chain. */
export function linearizeBranch(tree: ConversationTree, leafId: string): ConversationNode[] {
  const out: ConversationNode[] = [];
  let cursor: string | null = leafId;
  while (cursor) {
    const node: ConversationNode | undefined = tree.nodesById[cursor];
    if (!node) break;
    out.push(node);
    cursor = node.parentId;
  }
  return out.reverse();
}

/** Find every branch point (a node with 2+ children) — useful for the UI map. */
export function listBranchPoints(tree: ConversationTree): ConversationNode[] {
  return Object.values(tree.nodesById).filter((n) => n.childrenIds.length > 1);
}
