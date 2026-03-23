import { describe, it, expect } from "vitest";
import {
  isValidLocale,
  normalizeLocale,
  getIntlLocale,
  getLanguageName,
  getLocaleFromCookieHeader,
  getLocaleFromAcceptLanguage,
  getPreferredLocaleFromConfig,
  resolveLocale,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_DISPLAY_NAMES,
} from "./config";

describe("isValidLocale", () => {
  it("returns true for valid locales", () => {
    for (const loc of LOCALES) {
      expect(isValidLocale(loc)).toBe(true);
    }
  });

  it("returns false for invalid locales", () => {
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale("")).toBe(false);
    expect(isValidLocale("KO")).toBe(false);
  });
});

describe("normalizeLocale", () => {
  it("returns null for empty/null/undefined", () => {
    expect(normalizeLocale(null)).toBeNull();
    expect(normalizeLocale(undefined)).toBeNull();
    expect(normalizeLocale("")).toBeNull();
  });

  it("normalizes exact matches", () => {
    expect(normalizeLocale("ko")).toBe("ko");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("ja")).toBe("ja");
  });

  it("normalizes with trimming and lowercasing", () => {
    expect(normalizeLocale(" KO ")).toBe("ko");
    expect(normalizeLocale("EN")).toBe("en");
  });

  it("extracts base language from BCP-47 tags", () => {
    expect(normalizeLocale("ko-KR")).toBe("ko");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ja_JP")).toBe("ja");
    expect(normalizeLocale("zh-CN")).toBe("zh");
  });

  it("returns null for unsupported languages", () => {
    expect(normalizeLocale("fr-FR")).toBeNull();
    expect(normalizeLocale("de")).toBeNull();
  });
});

describe("getIntlLocale", () => {
  it("maps known locales to Intl tags", () => {
    expect(getIntlLocale("ko")).toBe("ko-KR");
    expect(getIntlLocale("en")).toBe("en-US");
    expect(getIntlLocale("ja")).toBe("ja-JP");
    expect(getIntlLocale("zh")).toBe("zh-CN");
    expect(getIntlLocale("es")).toBe("es-ES");
  });
});

describe("getLanguageName", () => {
  it("returns language names in English", () => {
    expect(getLanguageName("ko")).toBe("Korean");
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("ja")).toBe("Japanese");
    expect(getLanguageName("zh")).toBe("Chinese");
    expect(getLanguageName("es")).toBe("Spanish");
  });
});

describe("getLocaleFromCookieHeader", () => {
  it("returns null for null/undefined/empty", () => {
    expect(getLocaleFromCookieHeader(null)).toBeNull();
    expect(getLocaleFromCookieHeader(undefined)).toBeNull();
    expect(getLocaleFromCookieHeader("")).toBeNull();
  });

  it("extracts locale from cookie header", () => {
    expect(getLocaleFromCookieHeader("gyeol_locale=ko")).toBe("ko");
    expect(getLocaleFromCookieHeader("other=1; gyeol_locale=en; another=2")).toBe("en");
  });

  it("returns null when cookie is not present", () => {
    expect(getLocaleFromCookieHeader("session=abc; theme=dark")).toBeNull();
  });

  it("normalizes locale values", () => {
    expect(getLocaleFromCookieHeader("gyeol_locale=ko-KR")).toBe("ko");
  });
});

describe("getLocaleFromAcceptLanguage", () => {
  it("returns null for null/undefined/empty", () => {
    expect(getLocaleFromAcceptLanguage(null)).toBeNull();
    expect(getLocaleFromAcceptLanguage(undefined)).toBeNull();
    expect(getLocaleFromAcceptLanguage("")).toBeNull();
  });

  it("extracts first supported locale from Accept-Language", () => {
    expect(getLocaleFromAcceptLanguage("ko-KR,ko;q=0.9,en-US;q=0.8")).toBe("ko");
    expect(getLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("falls back through candidates until a match", () => {
    expect(getLocaleFromAcceptLanguage("fr-FR,de;q=0.8,ja;q=0.7")).toBe("ja");
  });

  it("returns null when no supported locale found", () => {
    expect(getLocaleFromAcceptLanguage("fr-FR,de;q=0.8")).toBeNull();
  });
});

describe("getPreferredLocaleFromConfig", () => {
  it("returns null for null/undefined/non-object", () => {
    expect(getPreferredLocaleFromConfig(null)).toBeNull();
    expect(getPreferredLocaleFromConfig(undefined)).toBeNull();
    expect(getPreferredLocaleFromConfig("ko")).toBeNull();
    expect(getPreferredLocaleFromConfig(42)).toBeNull();
  });

  it("reads preferred_locale field", () => {
    expect(getPreferredLocaleFromConfig({ preferred_locale: "ko" })).toBe("ko");
    expect(getPreferredLocaleFromConfig({ preferred_locale: "en-US" })).toBe("en");
  });

  it("falls back to locale field", () => {
    expect(getPreferredLocaleFromConfig({ locale: "ja" })).toBe("ja");
  });

  it("returns null for unsupported locale in config", () => {
    expect(getPreferredLocaleFromConfig({ preferred_locale: "fr" })).toBeNull();
  });
});

describe("resolveLocale", () => {
  it("returns DEFAULT_LOCALE when no options", () => {
    expect(resolveLocale()).toBe(DEFAULT_LOCALE);
  });

  it("prioritizes explicitLocale over everything", () => {
    expect(resolveLocale({
      explicitLocale: "ja",
      cookieLocale: "ko",
      acceptLanguage: "en",
      config: { preferred_locale: "zh" },
    })).toBe("ja");
  });

  it("uses cookieLocale as second priority", () => {
    expect(resolveLocale({ cookieLocale: "ko", acceptLanguage: "en" })).toBe("ko");
  });

  it("uses cookieHeader as third priority", () => {
    expect(resolveLocale({ cookieHeader: "gyeol_locale=zh", acceptLanguage: "en" })).toBe("zh");
  });

  it("uses config as fourth priority", () => {
    expect(resolveLocale({ config: { preferred_locale: "es" }, acceptLanguage: "en" })).toBe("es");
  });

  it("uses acceptLanguage as fifth priority", () => {
    expect(resolveLocale({ acceptLanguage: "ja-JP" })).toBe("ja");
  });

  it("uses fallback locale when provided", () => {
    expect(resolveLocale({ fallback: "ko" })).toBe("ko");
  });
});

describe("constants", () => {
  it("LOCALES has 5 entries", () => {
    expect(LOCALES).toHaveLength(5);
  });

  it("LOCALE_DISPLAY_NAMES maps all locales", () => {
    for (const loc of LOCALES) {
      expect(LOCALE_DISPLAY_NAMES[loc]).toBeDefined();
    }
  });

  it("DEFAULT_LOCALE is en", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});
