import { describe, it, expect } from "vitest";
import { buildShareCardMetadata, type ShareCardData } from "./card";

function makeCardData(overrides: Partial<ShareCardData> = {}): ShareCardData {
  return {
    self_name: "결",
    visual: { color: "#6ee7ff", shape: "amorphous" },
    total_messages: 50,
    vitality: 0.78,
    gen_level: 2,
    milestones: [
      { type: "first_chat", label: "첫 대화", at: "2026-01-01T00:00:00Z" },
    ],
    week_messages: 10,
    ...overrides,
  };
}

describe("buildShareCardMetadata", () => {
  it("returns Korean metadata for ko locale", () => {
    const meta = buildShareCardMetadata(makeCardData(), "ko");
    expect(meta.title).toContain("결");
    expect(meta.title).toContain("성장 카드");
    expect(meta.description).toContain("10");
  });

  it("returns English metadata for en locale", () => {
    const meta = buildShareCardMetadata(makeCardData({ self_name: "MyGyeol" }), "en");
    expect(meta.title).toContain("MyGyeol");
    expect(meta.title).toContain("growth card");
    expect(meta.description).toContain("10");
  });

  it("handles null data gracefully", () => {
    const meta = buildShareCardMetadata(null, "en");
    expect(meta.title).toBe("Gyeol growth card");
    expect(meta.description).toContain("Explore");
  });

  it("handles null data for ko locale", () => {
    const meta = buildShareCardMetadata(null, "ko");
    expect(meta.title).toBe("결의 공유 카드");
  });

  it("uses default description when week_messages is undefined", () => {
    const data = makeCardData();
    // @ts-expect-error testing undefined
    delete data.week_messages;
    // week_messages is undefined, not null — description still mentions milestones
    const meta = buildShareCardMetadata(data, "en");
    expect(meta.description).toBeTruthy();
  });

  it("falls back to English for non-ko locales", () => {
    const meta = buildShareCardMetadata(makeCardData(), "ja");
    expect(meta.title).toContain("growth card");
  });
});
