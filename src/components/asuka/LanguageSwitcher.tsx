import { useLang } from "@/i18n/LanguageProvider";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 backdrop-blur px-1 py-1 text-xs font-medium">
      <Globe className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
      <button
        onClick={() => setLang("fr")}
        className={`px-2.5 py-1 rounded-full transition ${lang === "fr" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full transition ${lang === "en" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
    </div>
  );
}