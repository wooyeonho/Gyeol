import { describe, expect, it } from "vitest";
import {
  backlinksFor,
  buildMorningBriefing,
  createKnowledgeGraph,
  DEFAULT_SNIPPETS,
  expandSnippet,
  extractLinkTargets,
  forkBranch,
  formatShortcut,
  INITIAL_REVIEW_STATE,
  linearizeBranch,
  linkNodes,
  listBranchPoints,
  parseQuickEntry,
  scheduleNextReview,
  searchSlashCommands,
  type ConversationNode,
  type ConversationTree,
} from "./world-class-patterns";

describe("searchSlashCommands", () => {
  it("returns all commands for empty query", () => {
    const all = searchSlashCommands("");
    expect(all.length).toBeGreaterThan(5);
  });
  it("ranks prefix matches above substring matches", () => {
    const results = searchSlashCommands("re");
    expect(results[0]?.trigger.startsWith("re")).toBe(true);
  });
  it("matches by Korean alias", () => {
    const results = searchSlashCommands("기억");
    expect(results.some((c) => c.id === "slash.remember")).toBe(true);
  });
});

describe("formatShortcut", () => {
  it("uses Apple glyphs on mac", () => {
    expect(formatShortcut(["mod", "k"], true)).toBe("⌘K");
  });
  it("uses Ctrl+K on non-mac", () => {
    expect(formatShortcut(["mod", "k"], false)).toBe("Ctrl+K");
  });
  it("handles shift and enter", () => {
    expect(formatShortcut(["shift", "enter"], false)).toBe("Shift+↵");
  });
});

describe("parseQuickEntry", () => {
  const now = new Date("2026-01-01T08:00:00.000Z");
  it("extracts hashtags", () => {
    const e = parseQuickEntry("명상 #focus #health", now);
    expect(e.tags).toEqual(["focus", "health"]);
    expect(e.text).toBe("명상");
  });
  it("parses priority", () => {
    const e = parseQuickEntry("!high 급한 일", now);
    expect(e.priority).toBe("high");
  });
  it("parses 내일 as tomorrow", () => {
    const e = parseQuickEntry("내일 명상 25분", now);
    expect(e.dueAt).not.toBeNull();
    const d = new Date(e.dueAt!);
    expect(d.getUTCDate()).toBe(2);
  });
  it("handles all together", () => {
    const e = parseQuickEntry("내일 !high 명상 25분 #focus", now);
    expect(e.priority).toBe("high");
    expect(e.tags).toContain("focus");
    expect(e.dueAt).not.toBeNull();
  });
});

describe("expandSnippet", () => {
  it("replaces variables", () => {
    const body = DEFAULT_SNIPPETS[0].body;
    const out = expandSnippet(body, { feeling: "좋" });
    expect(out).toContain("좋");
  });
  it("leaves unknown variables as placeholders", () => {
    const out = expandSnippet("hello {{name}}", {});
    expect(out).toBe("hello {{name}}");
  });
});

describe("conversation branching", () => {
  function makeTree(): ConversationTree {
    const root: ConversationNode = {
      id: "root",
      parentId: null,
      role: "user",
      content: "안녕",
      createdAt: 1,
      childrenIds: [],
    };
    return { nodesById: { root }, rootId: "root" };
  }

  it("forkBranch attaches a child under the parent", () => {
    const t = forkBranch(
      makeTree(),
      "root",
      { role: "assistant", content: "안녕", createdAt: 2 },
      "child1",
    );
    expect(t.nodesById["child1"].parentId).toBe("root");
    expect(t.nodesById["root"].childrenIds).toContain("child1");
  });

  it("linearizeBranch walks from leaf to root in order", () => {
    let t = makeTree();
    t = forkBranch(t, "root", { role: "assistant", content: "a", createdAt: 2 }, "a1");
    t = forkBranch(t, "a1", { role: "user", content: "b", createdAt: 3 }, "b1");
    const chain = linearizeBranch(t, "b1");
    expect(chain.map((n) => n.id)).toEqual(["root", "a1", "b1"]);
  });

  it("listBranchPoints finds nodes with 2+ children", () => {
    let t = makeTree();
    t = forkBranch(t, "root", { role: "assistant", content: "a", createdAt: 2 }, "a1");
    t = forkBranch(t, "root", { role: "assistant", content: "b", createdAt: 3 }, "b1");
    const points = listBranchPoints(t);
    expect(points.map((p) => p.id)).toContain("root");
  });
});

describe("spaced repetition (Readwise)", () => {
  it("forgot resets interval and lowers ease", () => {
    const next = scheduleNextReview({ ease: 2.5, intervalDays: 10, streak: 4 }, "forgot");
    expect(next.intervalDays).toBe(1);
    expect(next.streak).toBe(0);
    expect(next.ease).toBeLessThan(2.5);
  });
  it("good at streak=1 yields 1 day, streak=2 yields 6 days", () => {
    const s1 = scheduleNextReview(INITIAL_REVIEW_STATE, "good");
    expect(s1.intervalDays).toBe(1);
    expect(s1.streak).toBe(1);
    const s2 = scheduleNextReview(s1, "good");
    expect(s2.intervalDays).toBe(6);
    expect(s2.streak).toBe(2);
  });
  it("easy accelerates past good", () => {
    const easy = scheduleNextReview(INITIAL_REVIEW_STATE, "easy");
    const good = scheduleNextReview(INITIAL_REVIEW_STATE, "good");
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });
  it("clamps ease to [1.3, 3.0]", () => {
    let s = INITIAL_REVIEW_STATE;
    for (let i = 0; i < 30; i++) s = scheduleNextReview(s, "easy");
    expect(s.ease).toBeLessThanOrEqual(3.0);
    let s2 = INITIAL_REVIEW_STATE;
    for (let i = 0; i < 30; i++) s2 = scheduleNextReview(s2, "hard");
    expect(s2.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("knowledge graph (Obsidian)", () => {
  it("linkNodes is pure and adds nodes to the set", () => {
    const g = createKnowledgeGraph();
    const g2 = linkNodes(g, "a", "b");
    expect(g.nodes.size).toBe(0);
    expect(g2.nodes.has("a")).toBe(true);
    expect(g2.nodes.has("b")).toBe(true);
    expect(g2.edges.length).toBe(1);
  });
  it("backlinksFor returns only incoming edges, sorted desc", () => {
    let g = createKnowledgeGraph();
    g = linkNodes(g, "a", "target", 1);
    g = linkNodes(g, "b", "target", 5);
    g = linkNodes(g, "target", "c", 9); // outgoing, should not appear
    const back = backlinksFor(g, "target");
    expect(back).toHaveLength(2);
    expect(back[0].from).toBe("b");
    expect(back[1].from).toBe("a");
  });
  it("extractLinkTargets finds [[wiki]] style references", () => {
    const targets = extractLinkTargets("오늘은 [[달빛]] 과 [[약속]] 이 떠올랐다.");
    expect(targets).toEqual(["달빛", "약속"]);
  });
  it("extractLinkTargets returns empty for plain text", () => {
    expect(extractLinkTargets("plain text")).toEqual([]);
  });
});

describe("morning briefing (Sunrise / Fantastical)", () => {
  it("is stable for the same input", () => {
    const input = {
      newReflections: 2,
      streakDays: 5,
      reviewsDueToday: 3,
      activeChallengeCount: 1,
    };
    const a = buildMorningBriefing(input);
    const b = buildMorningBriefing(input);
    expect(a).toEqual(b);
  });
  it("falls back to a quiet message when there is nothing to surface", () => {
    const card = buildMorningBriefing({
      newReflections: 0,
      streakDays: 0,
      reviewsDueToday: 0,
      activeChallengeCount: 0,
    });
    expect(card.bullets).toHaveLength(1);
    expect(card.bullets[0]).toContain("조용한");
  });
  it("includes counts when they are non-zero", () => {
    const card = buildMorningBriefing({
      newReflections: 4,
      streakDays: 10,
      reviewsDueToday: 0,
      activeChallengeCount: 2,
    });
    expect(card.bullets.some((b) => b.includes("4"))).toBe(true);
    expect(card.bullets.some((b) => b.includes("10"))).toBe(true);
    expect(card.bullets.some((b) => b.includes("2"))).toBe(true);
  });
});
