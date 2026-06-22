export function getLocalizedName(item: Record<string, any>, lang: string): string {
  if (!item) return '';
  if (lang === 'en') return item.name ?? '';
  const field = `name_${lang}`;
  return item[field] || item.name_fr || item.name || '';
}

// Maps AU language codes to their localized display names
const LANG_NAMES: Record<string, Record<string, string>> = {
  ar: { en: "Arabic",     fr: "Arabe",     pt: "Árabe",    ar: "العربية",    es: "Árabe",    sw: "Kiarabu" },
  en: { en: "English",    fr: "Anglais",   pt: "Inglês",   ar: "الإنجليزية", es: "Inglés",   sw: "Kiingereza" },
  fr: { en: "French",     fr: "Français",  pt: "Francês",  ar: "الفرنسية",   es: "Francés",  sw: "Kifaransa" },
  pt: { en: "Portuguese", fr: "Portugais", pt: "Português",ar: "البرتغالية", es: "Portugués",sw: "Kireno" },
  sw: { en: "Swahili",    fr: "Swahili",   pt: "Suaíli",   ar: "السواحيلية", es: "Suajili",  sw: "Kiswahili" },
};

export function getLangDisplayName(code: string, visitorLang: string): string {
  if (!code) return code;
  return LANG_NAMES[code]?.[visitorLang] || LANG_NAMES[code]?.['fr'] || LANG_NAMES[code]?.['en'] || code;
}
