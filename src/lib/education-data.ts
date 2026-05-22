/**
 * Education Degrees and Levels
 */

export const DEGREE_LEVELS = [
  // Bachelor/License Equivalents
  { value: "bachelor", label_en: "Bachelor's Degree", label_fr: "Licence" },
  { value: "licence", label_en: "Licence (French)", label_fr: "Licence" },
  
  // Master's Degrees
  { value: "master", label_en: "Master's Degree", label_fr: "Master" },
  { value: "mba", label_en: "MBA", label_fr: "MBA" },
  
  // Doctoral Degrees
  { value: "phd", label_en: "PhD / Doctorate", label_fr: "Doctorat (PhD)" },
  { value: "doctorate", label_en: "Doctorate", label_fr: "Doctorat" },
  
  // French Technical Diplomas
  { value: "bts", label_en: "BTS (French Technical Diploma)", label_fr: "BTS" },
  { value: "dut", label_en: "DUT (French Technical Diploma)", label_fr: "DUT" },
  { value: "dea", label_en: "DEA (Advanced Studies Diploma)", label_fr: "DEA" },
  
  // Engineering Degrees
  { value: "engineer", label_en: "Engineering Degree", label_fr: "Diplôme d'Ingénieur" },
  
  // Vocational & Professional
  { value: "vocational", label_en: "Vocational Training", label_fr: "Formation Professionnelle" },
  { value: "professional", label_en: "Professional Certificate", label_fr: "Certificat Professionnel" },
  { value: "certificate", label_en: "Certificate", label_fr: "Certificat" },
  
  // High School
  { value: "highschool", label_en: "High School Diploma", label_fr: "Baccalauréat / BAC" },
  { value: "bac", label_en: "Baccalauréat (French)", label_fr: "Baccalauréat" },
  
  // International/Other
  { value: "associate", label_en: "Associate Degree", label_fr: "Diplôme d'études supérieures courtes" },
  { value: "diploma", label_en: "Diploma", label_fr: "Diplôme" },
  { value: "postdoctoral", label_en: "Postdoctoral Fellowship", label_fr: "Bourse Postdoctorale" },
  
  // Other
  { value: "other", label_en: "Other", label_fr: "Autre" },
];

/**
 * Get degree label for current language
 */
export function getDegreeLabelByLang(degreeValue: string, lang: "en" | "fr" = "en"): string {
  const degree = DEGREE_LEVELS.find(d => d.value === degreeValue);
  if (!degree) return degreeValue;
  return lang === "fr" ? degree.label_fr : degree.label_en;
}

/**
 * Get all degree labels for a language
 */
export function getDegreeListByLang(lang: "en" | "fr" = "en") {
  return DEGREE_LEVELS.map(degree => ({
    value: degree.value,
    label: lang === "fr" ? degree.label_fr : degree.label_en,
  }));
}
