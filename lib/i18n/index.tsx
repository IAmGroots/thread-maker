"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UILocale, TranslationDictionary } from "./types";
import { en } from "./en";
import { id } from "./id";

const UI_LOCALE_STORAGE_KEY = "threvo_ui_locale";
const UI_LOCALE_COOKIE = "threvo_ui_locale";
const DEFAULT_LOCALE: UILocale = "en";

function readCookieLocale(): UILocale | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${UI_LOCALE_COOKIE}=(en|id)(?:;|$)`),
  );
  return (match?.[1] as UILocale | undefined) ?? null;
}

function persistLocale(locale: UILocale) {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore storage access errors
  }
  // The server reads this cookie so <html lang> matches the chosen language.
  document.cookie = `${UI_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

interface I18nContextType {
  locale: UILocale;
  setLocale: (locale: UILocale) => void;
  t: TranslationDictionary;
  mounted: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: en,
  mounted: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<UILocale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
      const initial =
        saved === "id" || saved === "en" ? saved : readCookieLocale();
      if (initial) {
        setLocaleState(initial);
        document.documentElement.lang = initial;
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const setLocale = (newLocale: UILocale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  };

  const currentT = locale === "id" ? id : en;

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t: currentT,
        mounted,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export * from "./types";
export { en, id };
