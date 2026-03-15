import type { Locale } from "./config";
import ko from "../../messages/ko.json";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

/**
 * Bundled message catalogs. New locales fall back to English until
 * their translation file is created in messages/<locale>.json.
 *
 * To add a new language:
 * 1. Copy messages/en.json → messages/<locale>.json
 * 2. Translate all values
 * 3. Import and add to BUNDLED below
 */
const BUNDLED: Partial<Record<Locale, Messages>> = {
  ko: ko as Messages,
  en: en as Messages,
  // ja: (await import("../../messages/ja.json")).default — add when ready
  // zh: (await import("../../messages/zh.json")).default — add when ready
  // es: (await import("../../messages/es.json")).default — add when ready
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  // Try exact locale, then fallback to English
  return BUNDLED[locale] ?? BUNDLED.en ?? {};
}

export function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return typeof current === "string" ? current : undefined;
}
