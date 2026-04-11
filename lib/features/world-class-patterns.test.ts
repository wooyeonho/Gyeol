import { describe, expect, it } from "vitest";
import {
  DEFAULT_SNIPPETS,
  expandSnippet,
  forkBranch,
  formatShortcut,
  linearizeBranch,
  listBranchPoints,
  parseQuickEntry,
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
