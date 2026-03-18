export type { PromptStrings } from "./types";
import STRINGS_KO from "./ko";
import STRINGS_EN from "./en";
import STRINGS_JA from "./ja";
import STRINGS_ZH from "./zh";
import STRINGS_ES from "./es";
import type { PromptStrings } from "./types";

/** Synchronous locale-based lookup — all locales bundled server-side. */
export function getPromptStringsSync(locale?: string): PromptStrings {
  switch (locale) {
    case "ko":
    case "ko-KR":
      return STRINGS_KO;
    case "ja":
    case "ja-JP":
      return STRINGS_JA;
    case "zh":
    case "zh-CN":
      return STRINGS_ZH;
    case "es":
    case "es-ES":
      return STRINGS_ES;
    default:
      return STRINGS_EN;
  }
}
