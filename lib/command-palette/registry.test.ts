import { describe, it, expect } from "vitest";
import {
  scoreCommand,
  searchCommands,
  DEFAULT_COMMANDS,
  type Command,
} from "./registry";

const settingsCmd: Command = {
  id: "nav.settings",
  title: "Settings",
  group: "Navigation",
  keywords: ["preferences", "config"],
};

describe("command palette scoring", () => {
  it("gives a perfect score for exact title match", () => {
    expect(scoreCommand(settingsCmd, "settings")).toBe(1000);
  });

  it("prefers prefix matches over contains matches", () => {
    const prefix = scoreCommand(settingsCmd, "set");
    const contains = scoreCommand(
      { id: "x", title: "reset hazel", group: "Actions" },
      "set",
    );
    expect(prefix).toBeGreaterThan(contains);
  });

  it("matches on keywords", () => {
    expect(scoreCommand(settingsCmd, "config")).toBeGreaterThan(0);
    expect(scoreCommand(settingsCmd, "preferences")).toBeGreaterThan(0);
  });

  it("supports fuzzy subsequence matches", () => {
    // "sts" is a subsequence of "settings"
    expect(scoreCommand(settingsCmd, "stgs")).toBeGreaterThan(0);
  });

  it("returns 0 when no match is found", () => {
    expect(scoreCommand(settingsCmd, "xyz-unrelated-qq")).toBe(0);
  });

  it("returns all commands for an empty query", () => {
    const out = searchCommands("");
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeGreaterThanOrEqual(DEFAULT_COMMANDS.length);
  });

  it("searchCommands filters and ranks", () => {
    const out = searchCommands("security");
    expect(out.length).toBeGreaterThan(0);
    // The Security Center command should be near the top
    expect(out.slice(0, 3).some((c) => c.id === "security.center")).toBe(true);
  });
});
