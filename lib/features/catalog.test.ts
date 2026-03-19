import { describe, it, expect } from "vitest";
import { getLocalizedFeatureCatalog, FEATURE_CATALOG } from "./catalog";

describe("getLocalizedFeatureCatalog", () => {
  it("returns Korean names for ko locale", () => {
    const features = getLocalizedFeatureCatalog("ko");
    expect(features.length).toBeGreaterThan(0);
    const chat = features.find((f) => f.id === "core-chat");
    expect(chat?.name).toBe("AI 존재와의 대화");
  });

  it("returns English names for en locale", () => {
    const features = getLocalizedFeatureCatalog("en");
    const chat = features.find((f) => f.id === "core-chat");
    expect(chat?.name).toBe("Conversation with your AI being");
  });

  it("falls back to English for non-ko locales", () => {
    const ja = getLocalizedFeatureCatalog("ja");
    const zh = getLocalizedFeatureCatalog("zh");
    const es = getLocalizedFeatureCatalog("es");
    const chat_ja = ja.find((f) => f.id === "core-chat");
    const chat_zh = zh.find((f) => f.id === "core-chat");
    const chat_es = es.find((f) => f.id === "core-chat");
    expect(chat_ja?.name).toBe("Conversation with your AI being");
    expect(chat_zh?.name).toBe("Conversation with your AI being");
    expect(chat_es?.name).toBe("Conversation with your AI being");
  });

  it("each feature has required fields", () => {
    const features = getLocalizedFeatureCatalog("en");
    for (const f of features) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.summary).toBeTruthy();
      expect(f.href).toBeTruthy();
      expect(["core", "growth", "world", "creative", "experimental", "operations"]).toContain(f.category);
      expect(["ready", "beta", "planned"]).toContain(f.status);
    }
  });
});

describe("FEATURE_CATALOG", () => {
  it("is pre-built with ko locale", () => {
    expect(FEATURE_CATALOG.length).toBeGreaterThan(0);
    const chat = FEATURE_CATALOG.find((f) => f.id === "core-chat");
    expect(chat?.name).toBe("AI 존재와의 대화");
  });
});
