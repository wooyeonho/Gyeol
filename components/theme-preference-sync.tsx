"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";
import {
  applyThemePreferenceToDocument,
  isFontSize,
  isThemeMode,
  readStoredFontSize,
  readStoredHighContrast,
  readStoredReduceMotion,
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
        fontSize: readStoredFontSize(),
        reduceMotion: readStoredReduceMotion(),
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
    const storedFontSize = readStoredFontSize();
    const storedReduceMotion = readStoredReduceMotion();
    const nextMode = isThemeMode(config.preferred_theme) ? config.preferred_theme : storedMode;
    const nextHighContrast =
      typeof config.high_contrast_enabled === "boolean"
        ? config.high_contrast_enabled
        : storedHighContrast;
    const nextFontSize = isFontSize(config.font_size) ? config.font_size : storedFontSize;
    const nextReduceMotion =
      typeof config.reduce_motion === "boolean" ? config.reduce_motion : storedReduceMotion;

    if (
      nextMode !== storedMode ||
      nextHighContrast !== storedHighContrast ||
      nextFontSize !== storedFontSize ||
      nextReduceMotion !== storedReduceMotion
    ) {
      writeThemePreference({
        mode: nextMode,
        highContrast: nextHighContrast,
        fontSize: nextFontSize,
        reduceMotion: nextReduceMotion,
      });
      return;
    }

    applyThemePreferenceToDocument({
      mode: nextMode,
      highContrast: nextHighContrast,
      fontSize: nextFontSize,
      reduceMotion: nextReduceMotion,
    });
  }, [config]);

  return null;
}
