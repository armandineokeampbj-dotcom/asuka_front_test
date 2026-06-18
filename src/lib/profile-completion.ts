export type CompletionInput = {
  profile: any;
  educationCount: number;
  experienceCount: number;
  skillsCount: number;
  certificationsCount: number;
  portfolioCount: number;
};

const SECTIONS = [
  {
    key: "basics",
    weight: 10,
    test: (i: CompletionInput) => {
      const hasName = !!(i.profile?.preferred_name?.trim() || i.profile?.full_name?.trim());
      const hasCountry = !!(i.profile?.residence_country || i.profile?.country);
      return hasName && hasCountry;
    },
  },
  {
    key: "personal",
    weight: 10,
    test: (i: CompletionInput) =>
      !!(i.profile?.date_of_birth || i.profile?.nationality || i.profile?.city),
  },
  {
    key: "bio",
    weight: 10,
    test: (i: CompletionInput) =>
      !!(i.profile?.bio && i.profile.bio.length > 40),
  },
  {
    key: "languages",
    weight: 5,
    test: (i: CompletionInput) =>
      Array.isArray(i.profile?.languages_spoken) && i.profile.languages_spoken.length > 0,
  },
  {
    key: "education",
    weight: 15,
    test: (i: CompletionInput) => i.educationCount > 0,
  },
  {
    key: "experience",
    weight: 15,
    test: (i: CompletionInput) => i.experienceCount > 0,
  },
  {
    key: "skills",
    weight: 15,
    test: (i: CompletionInput) => i.skillsCount >= 3,
  },
  {
    key: "certifications",
    weight: 5,
    test: (i: CompletionInput) => i.certificationsCount > 0,
  },
  {
    key: "aspirations",
    weight: 5,
    test: (i: CompletionInput) =>
      !!(i.profile?.dream_career || (i.profile?.industries?.length ?? 0) > 0),
  },
  {
    key: "portfolio",
    weight: 5,
    test: (i: CompletionInput) =>
      i.portfolioCount > 0 ||
      !!(i.profile?.social_links && Object.values(i.profile.social_links).some(Boolean)),
  },
  {
    key: "cv",
    weight: 5,
    test: (i: CompletionInput) => !!(i.profile?.cvUrl || i.profile?.cv_url),
  },
];

export function computeCompletion(input: CompletionInput) {
  let score = 0;
  const missing: string[] = [];
  for (const s of SECTIONS) {
    if (s.test(input)) score += s.weight;
    else missing.push(s.key);
  }
  return { score: Math.min(100, score), missing };
}
