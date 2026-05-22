import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import translations from "./translations.json";
import { useAuth } from "@/context/AuthProvider";

type Language = "en" | "fr" | "pt" | "ar" | "es" | "sw";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_STORAGE_KEY = "asuka_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("fr");
  const { user } = useAuth();

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (savedLang && (translations[savedLang] !== undefined)) {
      setLang(savedLang);
    } else if (user && user.language) {
      const userLang = user.language as Language;
      if (translations[userLang] !== undefined) {
        setLang(userLang);
      }
    }
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, [lang]);

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[lang];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    return typeof value === "string" ? value : key;
  };

  const tArray = (key: string): string[] => {
    const keys = key.split(".");
    let value: any = translations[lang];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tArray }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used inside LanguageProvider");
  }
  return ctx;
}
