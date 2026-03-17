"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isValidLocale,
  type Locale,
} from "@/lib/i18n/config";
import { loadMessages, getNested } from "@/lib/i18n/messages";

type Messages = Record<string, unknown>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = "gyeol_locale";

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMessages(locale).then((m) => {
      setMessages(m);
      setReady(true);
    });
  }, [locale]);

  // On first mount, if no locale cookie exists, detect from navigator.language
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith(`${LOCALE_COOKIE_NAME}=`));
    if (!hasCookie) {
      const nav = navigator.language?.slice(0, 2);
      if (nav && isValidLocale(nav) && nav !== locale) {
        setLocaleState(nav);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persistLocale(l);
    loadMessages(l).then(setMessages);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      const value = getNested(messages as Record<string, unknown>, key);
      return value ?? key;
    },
    [messages]
  );

  useEffect(() => {
    if (!ready) return;
    loadMessages(locale).then(setMessages);
  }, [locale, ready]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    ready,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      t: (key: string) => key,
      locale: DEFAULT_LOCALE as Locale,
      setLocale: () => {},
      ready: false,
    };
  }
  return ctx;
}
