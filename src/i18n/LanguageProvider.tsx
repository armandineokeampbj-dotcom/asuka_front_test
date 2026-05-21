import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import translations from "./translations.json";
import { useAuth } from "@/context/AuthProvider";

type Language = "en" | "fr";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("fr");
  const { user } = useAuth();

  // Sync language with user's language preference
  useEffect(() => {
    if (user && user.language) {
      setLang(user.language as Language);
    }
  }, [user?.id]); // Dependency on user.id ensures it only updates when user changes

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

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
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
