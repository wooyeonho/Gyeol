import { describe, expect, it } from "vitest";
import {
  AI_NATIVE_PRINCIPLES,
  latencyBudgetFor,
  linkCitations,
  pathToRoot,
  pickRoutingReason,
  transitionInlineSuggestion,
} from "./world-class-ai-native";

describe("AI_NATIVE_PRINCIPLES", () => {
  it("has 12+ principles from 14+ source apps", () => {
    expect(AI_NATIVE_PRINCIPLES.length).toBeGreaterThanOrEqual(12);
  });
});

describe("transitionInlineSuggestion", () => {
  it("idle -> pending on request", () => {
    const s = transitionInlineSuggestion(
      { kind: "idle" },
      { type: "request", prompt: "hi", now: 1 },
    );
    expect(s.kind).toBe("pending");
  });
  it("pending -> ready on resolved", () => {
    const pending = transitionInlineSuggestion(
      { kind: "idle" },
      { type: "request", prompt: "hi", now: 1 },
    );
    const ready = transitionInlineSuggestion(pending, { type: "resolved", text: "hello" });
    expect(ready.kind).toBe("ready");
  });
  it("ready -> accepted only from ready", () => {
    const accepted = transitionInlineSuggestion(
      { kind: "ready", text: "hi", prompt: "p" },
      { type: "accept" },
    );
    expect(accepted.kind).toBe("accepted");
  });
  it("any -> dismissed on dismiss", () => {
    const s = transitionInlineSuggestion({ kind: "idle" }, { type: "dismiss" });
    expect(s.kind).toBe("dismissed");
  });
});

describe("linkCitations", () => {
  const citations = [
    { id: 1, title: "Source A", url: "https://a.example" },
    { id: 2, title: "Source B", url: "https://b.example" },
  ];
  it("replaces tokens with markdown links", () => {
    const out = linkCitations("claim [1] and [2]", citations);
    expect(out).toContain("https://a.example");
    expect(out).toContain("https://b.example");
  });
  it("leaves unknown ids intact", () => {
    expect(linkCitations("unknown [9]", citations)).toBe("unknown [9]");
  });
});

describe("pickRoutingReason", () => {
  const base = {
    messageLength: 500,
    hasAttachment: false,
    needsTools: false,
    isCreative: false,
    isOffline: false,
  };
  it("fast-chat for short messages", () => {
    expect(pickRoutingReason({ ...base, messageLength: 50 })).toBe("fast-chat");
  });
  it("long-context for huge messages", () => {
    expect(pickRoutingReason({ ...base, messageLength: 10_000 })).toBe("long-context");
  });
  it("tool-use overrides length", () => {
    expect(pickRoutingReason({ ...base, needsTools: true })).toBe("tool-use");
  });
  it("vision overrides tool-use", () => {
    expect(pickRoutingReason({ ...base, hasAttachment: true, needsTools: true })).toBe("vision");
  });
  it("offline overrides everything", () => {
    expect(pickRoutingReason({ ...base, isOffline: true, hasAttachment: true })).toBe(
      "local-fallback",
    );
  });
});

describe("latencyBudgetFor", () => {
  it("fast-chat is under 1 second", () => {
    expect(latencyBudgetFor("fast-chat")).toBeLessThan(1000);
  });
  it("deep-reasoning is the longest of the online reasons", () => {
    expect(latencyBudgetFor("deep-reasoning")).toBeGreaterThanOrEqual(
      latencyBudgetFor("fast-chat"),
    );
  });
});

describe("pathToRoot", () => {
  const nodes = [
    { id: "root", parentId: null, content: "r", createdAt: 0 },
    { id: "a", parentId: "root", content: "a", createdAt: 1 },
    { id: "b", parentId: "a", content: "b", createdAt: 2 },
    { id: "c", parentId: "root", content: "c", createdAt: 3 },
  ];
  it("walks a branch back to root", () => {
    expect(pathToRoot("b", nodes).map((n) => n.id)).toEqual(["root", "a", "b"]);
  });
  it("returns just [node] when parent is null", () => {
    expect(pathToRoot("root", nodes).map((n) => n.id)).toEqual(["root"]);
  });
});
