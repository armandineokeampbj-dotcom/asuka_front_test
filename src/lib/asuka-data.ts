import type { Lang } from "@/i18n/translations";

export type Opportunity = {
  id: string;
  type: "job" | "scholarship" | "training" | "grant" | "mentor";
  title: { fr: string; en: string };
  org: string;
  location: string;
  match: number;
  emoji: string;
  deadline: string;
};

export const OPPORTUNITIES: Opportunity[] = [
  { id: "1", type: "job", emoji: "💼", title: { fr: "Designer Produit Junior", en: "Junior Product Designer" }, org: "Wave", location: "Dakar, SN", match: 94, deadline: "2026-05-30" },
  { id: "2", type: "scholarship", emoji: "🎓", title: { fr: "Bourse Mastercard Foundation", en: "Mastercard Foundation Scholarship" }, org: "MCF", location: "Africa-wide", match: 88, deadline: "2026-06-15" },
  { id: "3", type: "training", emoji: "🚀", title: { fr: "Formation IA pour la jeunesse", en: "AI for Youth Training" }, org: "Asuka Academy", location: "Online", match: 91, deadline: "Rolling" },
  { id: "4", type: "grant", emoji: "💰", title: { fr: "Tony Elumelu Entrepreneurship", en: "Tony Elumelu Entrepreneurship" }, org: "TEF", location: "Africa-wide", match: 82, deadline: "2026-03-01" },
  { id: "5", type: "mentor", emoji: "🤝", title: { fr: "Mentorat carrière tech", en: "Tech career mentorship" }, org: "ALX Network", location: "Online", match: 87, deadline: "Open" },
  { id: "6", type: "job", emoji: "📈", title: { fr: "Analyste Data Junior", en: "Junior Data Analyst" }, org: "MTN", location: "Abidjan, CI", match: 79, deadline: "2026-04-20" },
  { id: "7", type: "training", emoji: "🌍", title: { fr: "Leadership des jeunes UN", en: "UN Youth Leadership Programme" }, org: "UNDP", location: "Hybrid", match: 85, deadline: "2026-05-10" },
  { id: "8", type: "scholarship", emoji: "✈️", title: { fr: "Bourse Chevening 2027", en: "Chevening Scholarship 2027" }, org: "UK Gov", location: "UK", match: 76, deadline: "2026-09-01" },
];

export type Pulse = {
  id: string;
  topic: { fr: string; en: string };
  question: { fr: string; en: string };
  options: { id: string; label: { fr: string; en: string }; pct: number }[];
  insight: { fr: string; en: string };
};

export const PULSES: Pulse[] = [
  { id: "p1", topic: { fr: "Avenir du travail", en: "Future of work" }, question: { fr: "Quelle compétence veux-tu prioriser cette année ?", en: "Which skill will you prioritise this year?" },
    options: [
      { id: "a", label: { fr: "IA & data", en: "AI & data" }, pct: 38 },
      { id: "b", label: { fr: "Design", en: "Design" }, pct: 22 },
      { id: "c", label: { fr: "Entrepreneuriat", en: "Entrepreneurship" }, pct: 27 },
      { id: "d", label: { fr: "Langues", en: "Languages" }, pct: 13 },
    ],
    insight: { fr: "72% des jeunes ayant ton profil souhaitent renforcer leurs compétences numériques.", en: "72% of youth with your profile want to strengthen digital skills." } },
  { id: "p2", topic: { fr: "Climat", en: "Climate" }, question: { fr: "Le climat doit-il être au cœur de ton métier futur ?", en: "Should climate be central to your future career?" },
    options: [
      { id: "a", label: { fr: "Oui, absolument", en: "Yes, absolutely" }, pct: 54 },
      { id: "b", label: { fr: "En partie", en: "Partially" }, pct: 32 },
      { id: "c", label: { fr: "Pas vraiment", en: "Not really" }, pct: 14 },
    ],
    insight: { fr: "1 jeune Africain·e sur 2 veut un travail à impact climatique.", en: "1 in 2 African youth want climate-impact work." } },
  { id: "p3", topic: { fr: "Mobilité", en: "Mobility" }, question: { fr: "Tu veux travailler…", en: "You want to work…" },
    options: [
      { id: "a", label: { fr: "Dans mon pays", en: "In my country" }, pct: 41 },
      { id: "b", label: { fr: "Ailleurs en Afrique", en: "Elsewhere in Africa" }, pct: 28 },
      { id: "c", label: { fr: "À l'international", en: "Internationally" }, pct: 31 },
    ],
    insight: { fr: "69% des jeunes veulent rester ou évoluer en Afrique.", en: "69% of youth want to stay or grow within Africa." } },
];

export function tt<T extends { fr: string; en: string }>(o: T, lang: Lang) {
  return o[lang];
}