export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEYS = {
  mode: "gyeol_theme_mode",
  highContrast: "gyeol_high_contrast",
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

export function applyThemePreferenceToDocument(params: {
  mode: ThemeMode;
  highContrast: boolean;
}) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = params.mode;
  document.documentElement.dataset.contrast = params.highContrast ? "high" : "normal";
  document.documentElement.style.colorScheme = params.mode;
}

export function writeThemePreference(params: {
  mode: ThemeMode;
  highContrast: boolean;
}) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEYS.mode, params.mode);
    window.localStorage.setItem(THEME_STORAGE_KEYS.highContrast, params.highContrast ? "1" : "0");
  } catch {
    // Ignore localStorage write failures in restricted environments.
  }

  applyThemePreferenceToDocument(params);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: params }));
}
