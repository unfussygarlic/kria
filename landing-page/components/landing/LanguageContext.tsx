"use client";

import {
  createContext, useContext, useState, useEffect, useMemo,
  type ReactNode,
} from "react";
import { en, hi, ta } from "./locales";
import type { Translations } from "./locales";

export type LangCode = "en" | "hi" | "ta";

const LOCALES: Record<LangCode, Translations> = { en, hi, ta };
const LS_KEY = "kria_lang";

type LangCtx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: Translations;
};

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: en });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  // Read preference on mount — runs once, client-only, no SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as LangCode | null;
    if (saved && saved in LOCALES) setLangState(saved);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem(LS_KEY, l);
  };

  // Stable reference: only changes when lang changes
  const t = useMemo(() => LOCALES[lang], [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

/** Returns the current translations object */
export const useT = () => useContext(Ctx).t;

/** Returns current lang code + setter */
export const useLang = () => {
  const { lang, setLang } = useContext(Ctx);
  return { lang, setLang };
};
