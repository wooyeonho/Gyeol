import type { Locale } from "./config";
import ko from "../../messages/ko.json";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

const BUNDLED: Record<Locale, Messages> = {
  ko: ko as Messages,
  en: en as Messages,
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  return BUNDLED[locale] ?? BUNDLED.ko;
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
