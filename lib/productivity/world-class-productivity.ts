/**
 * World-class productivity / collaboration patterns — from 13+ top apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.11):
 *   Notion, Linear, Figma, Slack, Height, ClickUp, Asana, Trello, Todoist,
 *   Things 3, Superhuman, Cron/Notion Calendar, Loom.
 */

export type ProductivityPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const PRODUCTIVITY_PRINCIPLES: readonly ProductivityPrinciple[] = [
  { id: "block-everything", source: "Notion", rule: "Every piece of content is a typed block; blocks rearrange with a drag handle." },
  { id: "cycles", source: "Linear", rule: "Work organizes around cycles, not deadlines; cycles auto-roll unfinished items." },
  { id: "live-cursor", source: "Figma", rule: "Shared cursors are first-class; presence is visible in every canvas." },
  { id: "thread-everything", source: "Slack", rule: "Replies always thread — never let channels become shouty monologues." },
  { id: "automation-rules", source: "Height", rule: "If-this-then-that rules live on boards, not buried in admin settings." },
  { id: "view-switcher", source: "ClickUp", rule: "A board has multiple views (list, kanban, gantt); view is a URL parameter." },
  { id: "timeline-view", source: "Asana", rule: "Long-horizon work renders as a horizontal timeline with drag-to-reschedule." },
  { id: "kanban", source: "Trello", rule: "Kanban columns are plain-old CSS grid; cards drag with inertial easing." },
  { id: "natural-language-input", source: "Todoist / Things 3", rule: "Typing 'call mom tomorrow 3pm' creates a scheduled task with zero extra clicks." },
  { id: "keyboard-first-inbox", source: "Superhuman", rule: "Inbox navigation is entirely keyboard-driven; mouse is optional." },
  { id: "keyboard-calendar", source: "Cron / Notion Calendar", rule: "Calendar accepts natural language and keyboard shortcuts for common durations." },
  { id: "async-video", source: "Loom", rule: "Short screen recordings replace meetings for status updates." },
] as const;

/* ── Natural language date parser (subset) ──────────────────────────── */

/**
 * Parse a subset of natural language date phrases into a concrete date.
 * Supported: "today", "tomorrow", "next monday", "mon", "in N days".
 * Returns null if unparseable so the caller can fall back to freeform input.
 */
export function parseNaturalDate(input: string, now: Date = new Date()): Date | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const base = new Date(now);
  base.setHours(9, 0, 0, 0);
  if (text === "today") return base;
  if (text === "tomorrow") {
    base.setDate(base.getDate() + 1);
    return base;
  }
  const inMatch = /^in (\d+) days?$/.exec(text);
  if (inMatch) {
    base.setDate(base.getDate() + Number(inMatch[1]));
    return base;
  }
  const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekdayMatch = /^(next )?(sun|mon|tue|wed|thu|fri|sat)$/.exec(text);
  if (weekdayMatch) {
    const target = weekdays.indexOf(weekdayMatch[2]);
    const today = base.getDay();
    let diff = (target - today + 7) % 7;
    if (diff === 0 || weekdayMatch[1]) diff += 7;
    base.setDate(base.getDate() + diff);
    return base;
  }
  return null;
}

/* ── Cycle roll-over ─────────────────────────────────────────────────── */

export type CycleItem = {
  id: string;
  status: "todo" | "in_progress" | "done";
  cycleId: string;
};

export function rollCycle(
  items: readonly CycleItem[],
  fromCycle: string,
  toCycle: string,
): CycleItem[] {
  return items.map((item) => {
    if (item.cycleId !== fromCycle) return item;
    if (item.status === "done") return item;
    return { ...item, cycleId: toCycle };
  });
}

/* ── View type switching ────────────────────────────────────────────── */

export type BoardView = "list" | "kanban" | "gantt" | "calendar";

export function cycleView(current: BoardView): BoardView {
  const order: BoardView[] = ["list", "kanban", "gantt", "calendar"];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
