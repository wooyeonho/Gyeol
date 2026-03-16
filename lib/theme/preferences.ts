export type ThemeMode = "dark" | "light";

export type FontSize = "small" | "medium" | "large" | "xlarge";

export function isFontSize(value: unknown): value is FontSize {
  return value === "small" || value === "medium" || value === "large" || value === "xlarge";
}

export const THEME_STORAGE_KEYS = {
  mode: "gyeol_theme_mode",
  highContrast: "gyeol_high_contrast",
  fontSize: "gyeol_font_size",
  reduceMotion: "gyeol_reduce_motion",
} as const;

export const THEME_CHANGE_EVENT = "gyeol-theme-change";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEYS.mode);
    return isThemeMode(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function readStoredHighContrast(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEYS.highContrast) === "1";
  } catch {
    return false;
  }
}

export function readStoredFontSize(): FontSize {
  if (typeof window === "undefined") return "medium";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEYS.fontSize);
    return isFontSize(stored) ? stored : "medium";
  } catch {
    return "medium";
  }
}

export function readStoredReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEYS.reduceMotion) === "1";
  } catch {
    return false;
  }
}

export function applyThemePreferenceToDocument(params: {
  mode: ThemeMode;
  highContrast: boolean;
  fontSize?: FontSize;
  reduceMotion?: boolean;
}) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = params.mode;
  document.documentElement.dataset.contrast = params.highContrast ? "high" : "normal";
  document.documentElement.style.colorScheme = params.mode;

  if (params.fontSize) {
    const sizeMap: Record<FontSize, string> = { small: "14px", medium: "16px", large: "18px", xlarge: "20px" };
    document.documentElement.style.fontSize = sizeMap[params.fontSize];
    document.documentElement.dataset.fontSize = params.fontSize;
  }

  if (params.reduceMotion !== undefined) {
    document.documentElement.dataset.reduceMotion = params.reduceMotion ? "true" : "false";
  }
}

export function writeThemePreference(params: {
  mode: ThemeMode;
  highContrast: boolean;
  fontSize?: FontSize;
  reduceMotion?: boolean;
}) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEYS.mode, params.mode);
    window.localStorage.setItem(THEME_STORAGE_KEYS.highContrast, params.highContrast ? "1" : "0");
    if (params.fontSize) {
      window.localStorage.setItem(THEME_STORAGE_KEYS.fontSize, params.fontSize);
    }
    if (params.reduceMotion !== undefined) {
      window.localStorage.setItem(THEME_STORAGE_KEYS.reduceMotion, params.reduceMotion ? "1" : "0");
    }
  } catch {
    // Ignore localStorage write failures in restricted environments.
  }

  applyThemePreferenceToDocument(params);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: params }));
}
