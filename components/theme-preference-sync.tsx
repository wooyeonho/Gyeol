"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";
import {
  applyThemePreferenceToDocument,
  isThemeMode,
  readStoredHighContrast,
  readStoredThemeMode,
  THEME_CHANGE_EVENT,
  writeThemePreference,
} from "@/lib/theme/preferences";

export function ThemePreferenceSync() {
  const agentState = useAgentStore((state) => state.agentState);
  const config = (agentState?.config as Record<string, unknown> | undefined) ?? null;

  useEffect(() => {
    const applyStoredPreference = () => {
      applyThemePreferenceToDocument({
        mode: readStoredThemeMode(),
        highContrast: readStoredHighContrast(),
      });
    };

    applyStoredPreference();

    const handleThemeChange = () => applyStoredPreference();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("gyeol_theme_")) {
        applyStoredPreference();
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!config) return;

    const storedMode = readStoredThemeMode();
    const storedHighContrast = readStoredHighContrast();
    const nextMode = isThemeMode(config.preferred_theme) ? config.preferred_theme : storedMode;
    const nextHighContrast =
      typeof config.high_contrast_enabled === "boolean"
        ? config.high_contrast_enabled
        : storedHighContrast;

    if (nextMode !== storedMode || nextHighContrast !== storedHighContrast) {
      writeThemePreference({
        mode: nextMode,
        highContrast: nextHighContrast,
      });
      return;
    }

    applyThemePreferenceToDocument({
      mode: nextMode,
      highContrast: nextHighContrast,
    });
  }, [config]);

  return null;
}
