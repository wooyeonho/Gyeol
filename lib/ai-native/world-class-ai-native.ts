/**
 * World-class AI-native patterns — synthesized from 14+ top AI-first apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.3):
 *   ChatGPT, Claude Artifacts, Perplexity Pages, Cursor, v0, Bolt.new,
 *   Arc Search, Granola, Pi, Character.AI, Midjourney, Runway,
 *   Suno/Udio, NotebookLM.
 *
 * Focus: the UX primitives that distinguish an "AI in an app" from a
 * truly "AI-native app" — artifacts, inline suggestions, citation-linked
 * answers, model routing, prompt templates, and streaming branches.
 */

export type AINativePrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const AI_NATIVE_PRINCIPLES: readonly AINativePrinciple[] = [
  {
    id: "artifact-panel",
    source: "Claude Artifacts",
    rule: "Code/UI/diagrams render in a dedicated side panel, not inline — user sees both convo and result.",
  },
  {
    id: "inline-suggestion",
    source: "Cursor / Copilot",
    rule: "Suggestions appear as ghost text; Tab accepts, Esc dismisses, never blocking the caret.",
  },
  {
    id: "citation-answer",
    source: "Perplexity",
    rule: "Every factual claim carries an inline numeric citation; clicking reveals the source.",
  },
  {
    id: "prompt-to-run",
    source: "Bolt.new / v0",
    rule: "A single prompt must produce a runnable artifact within 15s — no 'scaffold then configure'.",
  },
  {
    id: "custom-instructions",
    source: "ChatGPT",
    rule: "Users must be able to define persistent system instructions that apply across sessions.",
  },
  {
    id: "branching-conversation",
    source: "ChatGPT / Claude",
    rule: "Any message must support 'edit → new branch', keeping the old branch navigable.",
  },
  {
    id: "proactive-starter",
    source: "Pi",
    rule: "After 24h of silence, the AI sends one low-pressure check-in; never daily spam.",
  },
  {
    id: "auto-notetaking",
    source: "Granola",
    rule: "Long conversations auto-generate summaries + tags; user edits nudge the model.",
  },
  {
    id: "variation-gallery",
    source: "Midjourney",
    rule: "Generated images come in a grid of 4 with 'vary' and 'upscale' actions on each.",
  },
  {
    id: "timeline-generation",
    source: "Runway / Suno",
    rule: "Generative media lives on a timeline; re-rolls keep prior versions addressable.",
  },
  {
    id: "doc-to-podcast",
    source: "NotebookLM",
    rule: "Long documents can be exported as a 2-voice conversational podcast.",
  },
  {
    id: "character-persistence",
    source: "Character.AI",
    rule: "Characters carry session memory and traits; users can share/fork a character.",
  },
  {
    id: "search-then-browse",
    source: "Arc Search",
    rule: "Search results collapse into a synthesized single answer with source tiles underneath.",
  },
  {
    id: "model-routing",
    source: "결 orchestrator",
    rule: "Route fast chat → small model, deep synthesis → large; expose the routing reason.",
  },
] as const;

/* ── Inline suggestion state machine ──────────────────────────────────── */

export type InlineSuggestionState =
  | { kind: "idle" }
  | { kind: "pending"; prompt: string; startedAt: number }
  | { kind: "ready"; text: string; prompt: string }
  | { kind: "accepted"; text: string }
  | { kind: "dismissed" };

export function transitionInlineSuggestion(
  state: InlineSuggestionState,
  event:
    | { type: "request"; prompt: string; now: number }
    | { type: "resolved"; text: string }
    | { type: "accept" }
    | { type: "dismiss" }
    | { type: "reset" },
): InlineSuggestionState {
  switch (event.type) {
    case "request":
      return { kind: "pending", prompt: event.prompt, startedAt: event.now };
    case "resolved":
      if (state.kind !== "pending") return state;
      return { kind: "ready", text: event.text, prompt: state.prompt };
    case "accept":
      if (state.kind !== "ready") return state;
      return { kind: "accepted", text: state.text };
    case "dismiss":
      return { kind: "dismissed" };
    case "reset":
      return { kind: "idle" };
  }
}

/* ── Citation linker ──────────────────────────────────────────────────── */

export type Citation = { id: number; title: string; url: string };

/** Replace [n] tokens with accessible markdown links pointing into citations. */
export function linkCitations(text: string, citations: readonly Citation[]): string {
  const byId = new Map(citations.map((c) => [c.id, c]));
  return text.replace(/\[(\d+)\]/g, (match, idStr: string) => {
    const id = Number(idStr);
    const c = byId.get(id);
    if (!c) return match;
    return `[[${id}]](${c.url} "${c.title.replace(/"/g, "'")}")`;
  });
}

/* ── Model routing reasons ────────────────────────────────────────────── */

export type RoutingReason =
  | "fast-chat"
  | "long-context"
  | "tool-use"
  | "vision"
  | "deep-reasoning"
  | "creative-write"
  | "local-fallback";

export type RoutingDecision = {
  model: string;
  reason: RoutingReason;
  latencyBudgetMs: number;
};

export function pickRoutingReason(input: {
  messageLength: number;
  hasAttachment: boolean;
  needsTools: boolean;
  isCreative: boolean;
  isOffline: boolean;
}): RoutingReason {
  if (input.isOffline) return "local-fallback";
  if (input.hasAttachment) return "vision";
  if (input.needsTools) return "tool-use";
  if (input.isCreative) return "creative-write";
  if (input.messageLength > 4000) return "long-context";
  if (input.messageLength < 200) return "fast-chat";
  return "deep-reasoning";
}

export function latencyBudgetFor(reason: RoutingReason): number {
  switch (reason) {
    case "fast-chat":
      return 800;
    case "tool-use":
      return 2_500;
    case "vision":
      return 3_000;
    case "long-context":
      return 4_500;
    case "deep-reasoning":
      return 6_000;
    case "creative-write":
      return 5_000;
    case "local-fallback":
      return 1_500;
  }
}

/* ── Conversation branching ───────────────────────────────────────────── */

export type ConversationNode = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: number;
};

/** Walk from a node up to root, returning messages in conversation order. */
export function pathToRoot(
  nodeId: string,
  nodes: readonly ConversationNode[],
): ConversationNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: ConversationNode[] = [];
  let cur = byId.get(nodeId) ?? null;
  while (cur) {
    out.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) ?? null : null;
  }
  return out.reverse();
}
