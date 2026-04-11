import { describe, expect, it } from "vitest";
import {
  acceptHunk,
  DX_PRINCIPLES,
  previewUrl,
  rankCommands,
  rejectHunk,
  summarizeHunks,
  type CommandEntry,
  type DiffHunk,
} from "./world-class-dx";

describe("DX_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(DX_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("rankCommands", () => {
  const entries: CommandEntry[] = [
    { id: "new", label: "New Memory", keywords: ["create", "add"], group: "create" },
    { id: "settings", label: "Open Settings", keywords: ["prefs"], group: "nav" },
    { id: "logout", label: "Log Out", keywords: ["signout"], group: "action" },
  ];
  it("prioritizes label prefix match", () => {
    expect(rankCommands("new", entries)[0].id).toBe("new");
  });
  it("handles empty query as identity", () => {
    expect(rankCommands("", entries)).toHaveLength(3);
  });
  it("matches via subsequence when nothing else hits", () => {
    expect(rankCommands("og", entries)[0].id).toBe("logout");
  });
});

describe("previewUrl", () => {
  it("is deterministic for the same inputs", () => {
    const a = previewUrl("gyeol", "feature/top-apps", "abcdef1234567");
    const b = previewUrl("gyeol", "feature/top-apps", "abcdef1234567");
    expect(a).toBe(b);
  });
  it("slugifies special chars", () => {
    const url = previewUrl("gyeol", "feature/Top Apps!!", "abcdef1");
    expect(url).toContain("feature-top-apps");
    expect(url).not.toContain("!");
  });
});

describe("diff hunks", () => {
  const hunks: DiffHunk[] = [
    { id: "h1", file: "a.ts", startLine: 1, endLine: 5, added: 3, removed: 1, status: "proposed" },
    { id: "h2", file: "a.ts", startLine: 10, endLine: 15, added: 2, removed: 0, status: "proposed" },
  ];
  it("accepting flips status", () => {
    const after = acceptHunk(hunks, "h1");
    expect(after[0].status).toBe("accepted");
    expect(after[1].status).toBe("proposed");
  });
  it("rejecting flips status", () => {
    const after = rejectHunk(hunks, "h1");
    expect(after[0].status).toBe("rejected");
  });
  it("summary totals add up", () => {
    const after = acceptHunk(hunks, "h1");
    const sum = summarizeHunks(after);
    expect(sum.total).toBe(2);
    expect(sum.accepted).toBe(1);
    expect(sum.pending).toBe(1);
    expect(sum.linesAdded).toBe(5);
    expect(sum.linesRemoved).toBe(1);
  });
});
