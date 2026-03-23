import { describe, it, expect } from "vitest";
import { resolveGenerationLocale, getLanguageInstruction } from "./generation";

describe("resolveGenerationLocale", () => {
  it("delegates to resolveLocale and returns default", () => {
    const locale = resolveGenerationLocale();
    expect(locale).toBe("en");
  });

  it("respects explicit locale", () => {
    expect(resolveGenerationLocale({ explicitLocale: "ko" })).toBe("ko");
    expect(resolveGenerationLocale({ explicitLocale: "ja" })).toBe("ja");
  });

  it("respects config preferred_locale", () => {
    expect(resolveGenerationLocale({ config: { preferred_locale: "zh" } })).toBe("zh");
  });
});

describe("getLanguageInstruction", () => {
  it("returns sentence style by default", () => {
    expect(getLanguageInstruction("ko")).toBe("Write in Korean.");
    expect(getLanguageInstruction("en")).toBe("Write in English.");
    expect(getLanguageInstruction("ja")).toBe("Write in Japanese.");
  });

  it("returns adjective style", () => {
    expect(getLanguageInstruction("ko", "adjective")).toBe("Korean");
    expect(getLanguageInstruction("en", "adjective")).toBe("English");
  });
});
