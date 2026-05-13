import React, { createContext, useContext, useState, useEffect } from "react";

export type Lang = "fr" | "en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem("ns_lang");
    if (saved === "fr" || saved === "en") return saved;
    if (navigator.language.startsWith("fr")) return "fr";
  } catch {}
  return "fr";
}

export function LanguageProvider({
  children,
  translations,
}: {
  children: React.ReactNode;
  translations: Record<Lang, Record<string, string>>;
}) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("ns_lang", l); } catch {}
  };

  const t = (key: string): string =>
    translations[lang][key] ?? translations["fr"][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
