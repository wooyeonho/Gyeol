import { describe, it, expect } from "vitest";
import {
  isThemeMode,
  isFontSize,
  readStoredThemeMode,
  readStoredHighContrast,
  readStoredFontSize,
  readStoredReduceMotion,
  THEME_STORAGE_KEYS,
  THEME_CHANGE_EVENT,
} from "./preferences";

describe("isThemeMode", () => {
  it("returns true for dark and light", () => {
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("light")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isThemeMode("auto")).toBe(false);
    expect(isThemeMode("")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(42)).toBe(false);
  });
});

describe("isFontSize", () => {
  it("returns true for valid sizes", () => {
    expect(isFontSize("small")).toBe(true);
    expect(isFontSize("medium")).toBe(true);
    expect(isFontSize("large")).toBe(true);
    expect(isFontSize("xlarge")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isFontSize("tiny")).toBe(false);
    expect(isFontSize("")).toBe(false);
    expect(isFontSize(null)).toBe(false);
  });
});

describe("readStored* functions (server-side)", () => {
  it("readStoredThemeMode returns dark when window is undefined", () => {
    expect(readStoredThemeMode()).toBe("dark");
  });

  it("readStoredHighContrast returns false when window is undefined", () => {
    expect(readStoredHighContrast()).toBe(false);
  });

  it("readStoredFontSize returns medium when window is undefined", () => {
    expect(readStoredFontSize()).toBe("medium");
  });

  it("readStoredReduceMotion returns false when window is undefined", () => {
    expect(readStoredReduceMotion()).toBe(false);
  });
});

describe("THEME_STORAGE_KEYS", () => {
  it("has expected keys", () => {
    expect(THEME_STORAGE_KEYS.mode).toBe("gyeol_theme_mode");
    expect(THEME_STORAGE_KEYS.highContrast).toBe("gyeol_high_contrast");
    expect(THEME_STORAGE_KEYS.fontSize).toBe("gyeol_font_size");
    expect(THEME_STORAGE_KEYS.reduceMotion).toBe("gyeol_reduce_motion");
  });
});

describe("THEME_CHANGE_EVENT", () => {
  it("is a string constant", () => {
    expect(THEME_CHANGE_EVENT).toBe("gyeol-theme-change");
  });
});
