/**
 * World-class developer experience (DX) patterns — from 12+ top dev tools.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.7):
 *   Cursor, Vercel, Supabase, Linear, GitHub Copilot, Warp, Zed, Raycast,
 *   Figma Dev Mode, Railway, Fly.io, Turso/libSQL.
 *
 * Focuses on patterns that make a dev surface feel "built by devs for devs":
 *   — preview URLs for every change
 *   — global command palette with inline results
 *   — AI inline editing
 *   — keyboard-first ergonomics
 *   — one-click infra
 */

export type DxPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const DX_PRINCIPLES: readonly DxPrinciple[] = [
  {
    id: "preview-url",
    source: "Vercel",
    rule: "Every PR gets a unique preview URL; shareable without credentials.",
  },
  {
    id: "inline-ai-edit",
    source: "Cursor",
    rule: "AI edits apply as diff previews you can accept/reject hunk-by-hunk.",
  },
  {
    id: "transparent-baas",
    source: "Supabase",
    rule: "Every BaaS primitive has a live SQL/REST inspector one click away.",
  },
  {
    id: "keyboard-ticket",
    source: "Linear",
    rule: "Ticket creation and state transitions must be doable without touching the mouse.",
  },
  {
    id: "ai-terminal",
    source: "Warp",
    rule: "Terminal blocks are structured; natural-language → shell command is a side chat.",
  },
  {
    id: "collab-editor",
    source: "Zed",
    rule: "Multiplayer editing must be CRDT-based with <100ms cursor echo.",
  },
  {
    id: "global-command",
    source: "Raycast",
    rule: "A single global hotkey opens a palette that runs local + cloud commands.",
  },
  {
    id: "design-to-code",
    source: "Figma Dev Mode",
    rule: "Selecting a frame reveals code snippets for multiple target frameworks.",
  },
  {
    id: "one-click-infra",
    source: "Railway",
    rule: "Provision DB, cache, queue from a single dropdown — no IaC required.",
  },
  {
    id: "edge-global",
    source: "Fly.io / Cloudflare",
    rule: "Compute and data default to the user's nearest region.",
  },
  {
    id: "edge-sql",
    source: "Turso / libSQL",
    rule: "SQLite replicas run at the edge with local read + asynchronous primary write.",
  },
  {
    id: "type-safe-rpc",
    source: "tRPC / Hono RPC",
    rule: "Client and server share types at the function boundary with zero codegen.",
  },
] as const;

/* ── Command palette primitive ────────────────────────────────────────── */

export type CommandEntry = {
  id: string;
  label: string;
  keywords: readonly string[];
  group: "nav" | "action" | "create" | "toggle" | "ai";
  shortcut?: string;
};

/**
 * Fuzzy rank a query against a list of commands. Pure function; no fuzzy lib.
 * Scoring: exact label prefix > keyword prefix > subsequence > nothing.
 */
export function rankCommands(
  query: string,
  entries: readonly CommandEntry[],
): CommandEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  const scored: Array<{ e: CommandEntry; score: number }> = [];
  for (const e of entries) {
    const label = e.label.toLowerCase();
    let score = 0;
    if (label === q) score = 1000;
    else if (label.startsWith(q)) score = 500;
    else if (e.keywords.some((k) => k.toLowerCase().startsWith(q))) score = 300;
    else if (subseqMatch(q, label)) score = 100;
    else continue;
    score += Math.max(0, 50 - label.length); // prefer shorter
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.e);
}

function subseqMatch(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/* ── Preview URL generator ────────────────────────────────────────────── */

/**
 * Vercel-style preview URL: slug of branch + short hash.
 * Deterministic so preview URLs survive re-deploys of the same commit.
 */
export function previewUrl(project: string, branch: string, commitSha: string): string {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const short = commitSha.slice(0, 7);
  return `https://${project}-git-${slug}-${short}.vercel.app`;
}

/* ── Diff hunk primitive ──────────────────────────────────────────────── */

export type DiffHunk = {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  added: number;
  removed: number;
  status: "proposed" | "accepted" | "rejected";
};

export function acceptHunk(hunks: readonly DiffHunk[], id: string): DiffHunk[] {
  return hunks.map((h) => (h.id === id ? { ...h, status: "accepted" as const } : h));
}

export function rejectHunk(hunks: readonly DiffHunk[], id: string): DiffHunk[] {
  return hunks.map((h) => (h.id === id ? { ...h, status: "rejected" as const } : h));
}

export function summarizeHunks(hunks: readonly DiffHunk[]): {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  linesAdded: number;
  linesRemoved: number;
} {
  return hunks.reduce(
    (acc, h) => {
      acc.total++;
      if (h.status === "accepted") acc.accepted++;
      else if (h.status === "rejected") acc.rejected++;
      else acc.pending++;
      acc.linesAdded += h.added;
      acc.linesRemoved += h.removed;
      return acc;
    },
    { total: 0, accepted: 0, rejected: 0, pending: 0, linesAdded: 0, linesRemoved: 0 },
  );
}
