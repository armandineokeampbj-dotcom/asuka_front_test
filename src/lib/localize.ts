/**
 * Pick the localized display name from an API item that carries
 * name / name_fr / name_pt / name_ar / name_es / name_sw fields.
 *
 * Fallback chain: requested lang → fr → en (name).
 */
export function getLocalizedName(item: Record<string, any>, lang: string): string {
  if (!item) return '';
  if (lang === 'en') return item.name ?? '';
  const field = `name_${lang}`;
  return item[field] || item.name_fr || item.name || '';
}
