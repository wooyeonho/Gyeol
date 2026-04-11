import { describe, expect, it } from "vitest";
import {
  DISAPPEAR_SECONDS,
  extractMentions,
  isExpired,
  MESSAGE_EFFECTS,
  MESSAGING_PRINCIPLES,
  toggleTapback,
} from "./world-class-messaging";

describe("MESSAGING_PRINCIPLES", () => {
  it("covers 10 principles", () => {
    expect(MESSAGING_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("MESSAGE_EFFECTS", () => {
  it("has a none baseline with zero duration", () => {
    expect(MESSAGE_EFFECTS.none.durationMs).toBe(0);
  });
});

describe("toggleTapback", () => {
  it("adds on first tap", () => {
    expect(toggleTapback([], "heart")).toEqual(["heart"]);
  });
  it("removes on second tap", () => {
    expect(toggleTapback(["heart"], "heart")).toEqual([]);
  });
  it("accumulates different reactions", () => {
    expect(toggleTapback(["heart"], "laugh")).toEqual(["heart", "laugh"]);
  });
});

describe("isExpired", () => {
  it("off never expires", () => {
    expect(isExpired(0, "off", 1_000_000_000_000)).toBe(false);
  });
  it("5min expires after 5 minutes", () => {
    const sent = 0;
    const now = DISAPPEAR_SECONDS["5min"] * 1000 + 1;
    expect(isExpired(sent, "5min", now)).toBe(true);
  });
  it("5min not expired before 5 minutes", () => {
    expect(isExpired(0, "5min", 1000)).toBe(false);
  });
});

describe("extractMentions", () => {
  it("parses multiple mentions", () => {
    expect(extractMentions("@gyeol hello @bob")).toEqual(["gyeol", "bob"]);
  });
  it("requires at least 2 chars", () => {
    expect(extractMentions("@a nope")).toEqual([]);
  });
  it("handles no mentions", () => {
    expect(extractMentions("plain message")).toEqual([]);
  });
});
