import { useLang } from "@/i18n/LanguageProvider";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en", name: "English",   country: "gb" },
  { code: "fr", name: "Français",  country: "fr" },
  { code: "pt", name: "Português", country: "pt" },
  { code: "ar", name: "العربية",   country: "sa" },
  { code: "es", name: "Español",   country: "es" },
  { code: "sw", name: "Kiswahili", country: "ke" },
];

function FlagImg({ country, name }: { country: string; name: string }) {
  return (
    <img
      src={`https://flagcdn.com/20x15/${country}.png`}
      srcSet={`https://flagcdn.com/40x30/${country}.png 2x`}
      width={20}
      height={15}
      alt={name}
      className="rounded-sm object-cover shrink-0"
    />
  );
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  const currentLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-2 text-sm font-medium transition hover:bg-card/80">
          {currentLang && (
            <FlagImg country={currentLang.country} name={currentLang.name} />
          )}
          <span className="hidden sm:inline">{currentLang?.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLang(language.code as any)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FlagImg country={language.country} name={language.name} />
                <span>{language.name}</span>
              </div>
              {lang === language.code && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}