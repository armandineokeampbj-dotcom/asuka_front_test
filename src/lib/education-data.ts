/**
 * Education Degrees and Levels
 */

export const DEGREE_LEVELS = [
  // Bachelor/Licence
  {
    value: "bachelor",
    label_en: "Bachelor's Degree",
    label_fr: "Licence",
    label_pt: "Bacharelato / Licenciatura",
    label_ar: "بكالوريوس",
    label_es: "Licenciatura",
    label_sw: "Shahada ya Kwanza",
  },
  {
    value: "licence",
    label_en: "Licence (French)",
    label_fr: "Licence",
    label_pt: "Licenciatura",
    label_ar: "ليسانس",
    label_es: "Licenciatura",
    label_sw: "Shahada ya Kwanza",
  },

  // Master
  {
    value: "master",
    label_en: "Master's Degree",
    label_fr: "Master",
    label_pt: "Mestrado",
    label_ar: "ماجستير",
    label_es: "Máster",
    label_sw: "Shahada ya Uzamili",
  },
  {
    value: "mba",
    label_en: "MBA",
    label_fr: "MBA",
    label_pt: "MBA",
    label_ar: "ماجستير إدارة الأعمال",
    label_es: "MBA",
    label_sw: "MBA",
  },

  // Doctoral
  {
    value: "phd",
    label_en: "PhD / Doctorate",
    label_fr: "Doctorat (PhD)",
    label_pt: "Doutoramento (PhD)",
    label_ar: "دكتوراه (PhD)",
    label_es: "Doctorado (PhD)",
    label_sw: "Uzamivu (PhD)",
  },
  {
    value: "doctorate",
    label_en: "Doctorate",
    label_fr: "Doctorat",
    label_pt: "Doutoramento",
    label_ar: "دكتوراه",
    label_es: "Doctorado",
    label_sw: "Uzamivu",
  },

  // French Technical Diplomas
  {
    value: "bts",
    label_en: "BTS (French Technical Diploma)",
    label_fr: "BTS",
    label_pt: "BTS (Diploma Técnico)",
    label_ar: "BTS",
    label_es: "BTS",
    label_sw: "BTS",
  },
  {
    value: "dut",
    label_en: "DUT (French Technical Diploma)",
    label_fr: "DUT",
    label_pt: "DUT (Diploma Técnico)",
    label_ar: "DUT",
    label_es: "DUT",
    label_sw: "DUT",
  },
  {
    value: "dea",
    label_en: "DEA (Advanced Studies Diploma)",
    label_fr: "DEA",
    label_pt: "DEA (Diploma de Estudos Avançados)",
    label_ar: "دبلوم الدراسات المعمقة",
    label_es: "DEA",
    label_sw: "DEA",
  },

  // Engineering
  {
    value: "engineer",
    label_en: "Engineering Degree",
    label_fr: "Diplôme d'Ingénieur",
    label_pt: "Grau de Engenharia",
    label_ar: "شهادة هندسية",
    label_es: "Título de Ingeniería",
    label_sw: "Shahada ya Uhandisi",
  },

  // Vocational & Professional
  {
    value: "vocational",
    label_en: "Vocational Training",
    label_fr: "Formation Professionnelle",
    label_pt: "Formação Profissional",
    label_ar: "تدريب مهني",
    label_es: "Formación Profesional",
    label_sw: "Mafunzo ya Ufundi",
  },
  {
    value: "professional",
    label_en: "Professional Certificate",
    label_fr: "Certificat Professionnel",
    label_pt: "Certificado Profissional",
    label_ar: "شهادة مهنية",
    label_es: "Certificado Profesional",
    label_sw: "Cheti cha Kitaalamu",
  },
  {
    value: "certificate",
    label_en: "Certificate",
    label_fr: "Certificat",
    label_pt: "Certificado",
    label_ar: "شهادة",
    label_es: "Certificado",
    label_sw: "Cheti",
  },

  // High School
  {
    value: "highschool",
    label_en: "High School Diploma",
    label_fr: "Baccalauréat / BAC",
    label_pt: "Diploma do Ensino Médio",
    label_ar: "شهادة الثانوية العامة",
    label_es: "Bachillerato",
    label_sw: "Cheti cha Shule ya Sekondari",
  },
  {
    value: "bac",
    label_en: "Baccalauréat (French)",
    label_fr: "Baccalauréat",
    label_pt: "Baccalauréat",
    label_ar: "البكالوريا",
    label_es: "Bachillerato",
    label_sw: "Baccalauréat",
  },

  // International / Other
  {
    value: "associate",
    label_en: "Associate Degree",
    label_fr: "Diplôme d'études supérieures courtes",
    label_pt: "Diploma de Estudos Superiores Curtos",
    label_ar: "دبلوم دراسات عليا",
    label_es: "Título de Asociado",
    label_sw: "Stashahada",
  },
  {
    value: "diploma",
    label_en: "Diploma",
    label_fr: "Diplôme",
    label_pt: "Diploma",
    label_ar: "دبلوم",
    label_es: "Diploma",
    label_sw: "Diploma",
  },
  {
    value: "postdoctoral",
    label_en: "Postdoctoral Fellowship",
    label_fr: "Bourse Postdoctorale",
    label_pt: "Bolsa de Pós-Doutoramento",
    label_ar: "زمالة ما بعد الدكتوراه",
    label_es: "Beca Postdoctoral",
    label_sw: "Ushirika wa Baada ya Uzamivu",
  },

  // Other
  {
    value: "other",
    label_en: "Other",
    label_fr: "Autre",
    label_pt: "Outro",
    label_ar: "أخرى",
    label_es: "Otro",
    label_sw: "Nyingine",
  },
];

/**
 * Get degree label for current language, with fallback chain.
 */
export function getDegreeLabelByLang(degreeValue: string, lang: string = "en"): string {
  const degree = DEGREE_LEVELS.find(d => d.value === degreeValue);
  if (!degree) return degreeValue;
  const field = `label_${lang}` as keyof typeof degree;
  return (degree[field] as string) || degree.label_fr || degree.label_en;
}

/**
 * Get all degree labels for a language.
 */
export function getDegreeListByLang(lang: string = "en") {
  return DEGREE_LEVELS.map(degree => {
    const field = `label_${lang}` as keyof typeof degree;
    return {
      value: degree.value,
      label: (degree[field] as string) || degree.label_fr || degree.label_en,
    };
  });
}
