import { apiCall } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  skills: { id: string; name: string; level: string }[];
  education: { id: string; title: string; field: string; status: string }[];
  certifications: { id: string; name: string; issuedDate: string }[];
}

export async function awardXp(userId: string, amount: number, reason: string, metadata: Record<string, unknown> = {}) {
  try {
    await apiCall("/api/xp-events", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, amount, reason, metadata }),
    });
  } catch (error) {
    console.error("Failed to award XP:", error);
  }
}

export async function notify(userId: string, title: string, body?: string, kind: "system" | "opportunity" | "application" | "coach" | "profile" | "pulse" | "reward" = "system", data: Record<string, unknown> = {}) {
  try {
    await apiCall("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ userId, title, body, kind, data }),
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

export async function awardBadgeIfMissing(userId: string, badgeId: string) {
  try {
    const result = await apiCall<{ awarded: boolean }>("/api/user-badges/award", {
      method: "POST",
      body: JSON.stringify({ userId, badgeId }),
    });
    return result.awarded || false;
  } catch (error) {
    console.error("Failed to award badge:", error);
    return false;
  }
}

/**
 * Calculate employability score based on profile completion
 */
export function calculateEmployabilityScore(profile: Partial<UserProfile>): number {
  let score = 20; // Base score
  
  if (profile.firstName && profile.lastName) score += 10;
  if (profile.email) score += 5;
  if (profile.skills && profile.skills.length > 0) score += 20;
  if (profile.skills && profile.skills.length >= 5) score += 10;
  if (profile.education && profile.education.length > 0) score += 15;
  if (profile.certifications && profile.certifications.length > 0) score += 20;
  
  return Math.min(score, 100);
}

/**
 * Generate personalized AI Coach recommendations
 */
export function generateAICoachContent(
  profile: Partial<UserProfile> | null,
  lang: "en" | "fr"
): { advice: string; recommendation: string; scoreTarget: number } {
  if (!profile) {
    // Return default content if no profile
    return {
      advice: lang === "fr"
        ? "D'après ton profil, postule à 3 opportunités cette semaine et complète ta certification IA."
        : "Based on your profile, apply to 3 opportunities this week and finish your AI certification.",
      recommendation: lang === "fr"
        ? "Augmente ton score d'employabilité"
        : "Boost your employability score",
      scoreTarget: 86,
    };
  }

  const score = calculateEmployabilityScore(profile);
  const firstName = profile.firstName || (lang === "fr" ? "ami" : "friend");
  const scoreTarget = Math.min(score + 10, 95);
  
  // Determine recommendations based on profile gaps
  const recommendations: { en: string[]; fr: string[] } = {
    en: [
      "Complete your profile skills section to boost visibility",
      "Add technical certifications like Google Cloud or AWS",
      "Document your project experience in detail",
      "Join open opportunities and build your track record",
    ],
    fr: [
      "Complète ta section compétences pour augmenter ta visibilité",
      "Ajoute des certifications techniques comme Google Cloud ou AWS",
      "Documente ton expérience projet en détail",
      "Rejoins des opportunités ouvertes et construis ton historique",
    ],
  };
  
  // Profile-specific advice
  let advice = "";
  if (!profile.skills || profile.skills.length === 0) {
    advice = lang === "fr" 
      ? `${firstName}, ajoute tes compétences pour que les opportunités te trouvent.`
      : `${firstName}, add your skills so opportunities find you.`;
  } else if (!profile.certifications || profile.certifications.length === 0) {
    advice = lang === "fr"
      ? `${firstName}, les certifications renforcent ton profil — ajoutes-en au moins une.`
      : `${firstName}, certifications strengthen your profile — add at least one.`;
  } else if (!profile.education || profile.education.length === 0) {
    advice = lang === "fr"
      ? `${firstName}, ajoute ta formation pour montrer ton parcours.`
      : `${firstName}, add your education to show your journey.`;
  } else {
    advice = lang === "fr"
      ? `${firstName}, bravo pour ton profil ! Continue à construire ton expérience.`
      : `${firstName}, great job on your profile! Keep building your experience.`;
  }
  
  const recommendation = recommendations[lang][Math.floor(Math.random() * recommendations[lang].length)];
  
  return {
    advice,
    recommendation,
    scoreTarget,
  };
}