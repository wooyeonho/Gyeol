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
  normalizeLocale,
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

function getBrowserLocale(initialLocale: Locale): Locale {
  if (typeof window === "undefined") return initialLocale;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  const storedLocale = normalizeLocale(stored);
  if (storedLocale) return storedLocale;

  const navLocale = normalizeLocale(navigator.language);
  return navLocale ?? initialLocale;
}

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
    const preferred = getBrowserLocale(initialLocale);
    setLocaleState((current) => (current === preferred ? current : preferred));
    persistLocale(preferred);
  }, [initialLocale]);

  useEffect(() => {
    loadMessages(locale).then((m) => {
      setMessages(m);
      setReady(true);
    });
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
