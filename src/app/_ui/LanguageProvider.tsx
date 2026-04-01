"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { messages, type AppLocale } from "@/i18n";

type LanguageContextType = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("crm-locale");
    if (saved === "tr" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(next: AppLocale) {
    localStorage.setItem("crm-locale", next);
    setLocaleState(next);
  }

  const value = useMemo(() => {
    const dict = messages[locale];

    return {
      locale,
      setLocale,
      t: (path: string) => {
        const value = getNestedValue(dict, path);
        return typeof value === "string" ? value : path;
      },
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}