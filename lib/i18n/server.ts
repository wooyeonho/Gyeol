import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, resolveLocale, type Locale } from "@/lib/i18n/config";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveLocale({
    acceptLanguage: headerStore.get("accept-language"),
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null,
    explicitLocale: headerStore.get("x-gyeol-locale"),
  });
}
