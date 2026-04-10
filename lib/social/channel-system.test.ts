import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHANNELS,
  getChannelsByType,
  getRecommendedChannels,
  formatChannelName,
  canPostInChannel,
} from "./channel-system";
import type { Channel, ChannelType } from "./channel-system";

describe("channel-system", () => {
  // ── DEFAULT_CHANNELS ────────────────────────────────────────────────────

  it("exports at least 8 default channels", () => {
    expect(DEFAULT_CHANNELS.length).toBeGreaterThanOrEqual(8);
  });

  it("every channel has required fields", () => {
    for (const ch of DEFAULT_CHANNELS) {
      expect(ch.id).toBeTruthy();
      expect(ch.name.ko).toBeTruthy();
      expect(ch.name.en).toBeTruthy();
      expect(ch.description.ko).toBeTruthy();
      expect(ch.description.en).toBeTruthy();
      expect(["general", "species", "type", "events"]).toContain(ch.type);
      expect(ch.icon).toBeTruthy();
      expect(typeof ch.memberCount).toBe("number");
    }
  });

  // ── getChannelsByType ───────────────────────────────────────────────────

  it("filters channels by type", () => {
    const speciesChannels = getChannelsByType("species");
    expect(speciesChannels.length).toBeGreaterThanOrEqual(1);
    expect(speciesChannels.every((ch) => ch.type === "species")).toBe(true);

    const eventChannels = getChannelsByType("events");
    expect(eventChannels.length).toBeGreaterThanOrEqual(1);
    expect(eventChannels.every((ch) => ch.type === "events")).toBe(true);
  });

  it("returns empty array for non-matching type", () => {
    // Cast to test with a type that has no channels
    const result = getChannelsByType("nonexistent" as ChannelType);
    expect(result).toEqual([]);
  });

  // ── getRecommendedChannels ──────────────────────────────────────────────

  it("recommends general + type channel for analytical creature", () => {
    const recommended = getRecommendedChannels("analytical", "calc-ember-seeker");
    const ids = recommended.map((ch) => ch.id);
    expect(ids).toContain("ch-general");
    expect(ids).toContain("ch-type-analytical");
    expect(ids).toContain("ch-events-weekly");
  });

  it("recommends species channel when species name contains archetype keyword", () => {
    const recommended = getRecommendedChannels("emotional", "myst-glow-ethereal-keeper");
    const ids = recommended.map((ch) => ch.id);
    expect(ids).toContain("ch-species-ethereal");
    expect(ids).toContain("ch-type-emotional");
  });

  it("recommends general for balanced type", () => {
    const recommended = getRecommendedChannels("balanced", "plain-being-one");
    const ids = recommended.map((ch) => ch.id);
    expect(ids).toContain("ch-general");
    expect(ids).toContain("ch-events-weekly");
  });

  // ── formatChannelName ──────────────────────────────────────────────────

  it("returns Korean name for ko locale", () => {
    const ch = DEFAULT_CHANNELS[0];
    expect(formatChannelName(ch, "ko")).toBe(ch.name.ko);
    expect(formatChannelName(ch, "ko-KR")).toBe(ch.name.ko);
  });

  it("returns English name for non-ko locale", () => {
    const ch = DEFAULT_CHANNELS[0];
    expect(formatChannelName(ch, "en")).toBe(ch.name.en);
    expect(formatChannelName(ch, "ja")).toBe(ch.name.en);
  });

  // ── canPostInChannel ───────────────────────────────────────────────────

  it("allows anyone to post in channels with no age restriction", () => {
    const openChannel = DEFAULT_CHANNELS.find((ch) => ch.minAge === null)!;
    expect(canPostInChannel(openChannel, "under_13")).toBe(true);
    expect(canPostInChannel(openChannel, "teen")).toBe(true);
    expect(canPostInChannel(openChannel, "adult")).toBe(true);
  });

  it("restricts adult-only channels to adults", () => {
    const adultChannel = DEFAULT_CHANNELS.find((ch) => ch.minAge === "adult")!;
    expect(adultChannel).toBeDefined();
    expect(canPostInChannel(adultChannel, "under_13")).toBe(false);
    expect(canPostInChannel(adultChannel, "teen")).toBe(false);
    expect(canPostInChannel(adultChannel, "adult")).toBe(true);
  });

  it("respects age rank ordering for teen-gated channel", () => {
    const teenChannel: Channel = {
      id: "ch-test-teen",
      name: { ko: "10대 채널", en: "Teen Channel" },
      description: { ko: "테스트", en: "Test" },
      type: "general",
      icon: "T",
      memberCount: 0,
      minAge: "teen",
    };
    expect(canPostInChannel(teenChannel, "under_13")).toBe(false);
    expect(canPostInChannel(teenChannel, "teen")).toBe(true);
    expect(canPostInChannel(teenChannel, "adult")).toBe(true);
  });
});
